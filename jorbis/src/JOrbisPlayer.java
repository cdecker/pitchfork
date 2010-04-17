/* -*-mode:java; c-basic-offset:2; indent-tabs-mode:nil -*- */
/* JOrbisPlayer -- pure Java Ogg Vorbis player
 *
 * Copyright (C) 2000 ymnk, JCraft,Inc.
 *
 * Written by: 2000 ymnk<ymnk@jcraft.com>
 *
 * Many thanks to 
 *   Monty <monty@xiph.org> and 
 *   The XIPHOPHORUS Company http://www.xiph.org/ .
 * JOrbis has been based on their awesome works, Vorbis codec and
 * JOrbisPlayer depends on JOrbis.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 */

/*
 * Modified 2007 by Roger Bystrøm for pitchfork <pitchfork@remiss.org>
 */

import java.util.*;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.*;

import java.awt.*;
import java.awt.event.*;
import java.applet.*;
import javax.swing.*;

import com.jcraft.jorbis.*;
import com.jcraft.jogg.*;

import javax.sound.sampled.*;

public class JOrbisPlayer extends JApplet implements ActionListener {

	Thread player=null;
	InputStream bitStream=null;
	URLConnection urlc = null;

	public static final String PLAY = "Play", STOP = "Stop";
	
	static AppletContext acontext=null;

	static final int BUFSIZE=4096*2;
	static int convsize=BUFSIZE*2;
	static byte[] convbuffer=new byte[convsize]; 

	PlayWatch playThread;
	
	private int RETRY=3;
	int retry=RETRY;

	SyncState oy;
	StreamState os;
	Page og;
	Packet op;
	Info vi;
	Comment vc;
	DspState vd;
	Block vb;

	byte[] buffer=null;
	int bytes=0;

	int format;
	int rate=0;
	int channels=0;
	int left_vol_scale=100;
	int right_vol_scale=100;
	SourceDataLine outputLine=null;
	String current_source=null;

	int frameSizeInBytes;
	int bufferLengthInBytes;

	boolean playonstartup=false;

	public Color bgColor = Color.lightGray;

	public void init(){

		playThread = new PlayWatch();
		playThread.start();

		acontext=getAppletContext();

		loadPlaylist();

		if(playlist.size()>0){
			String s=getParameter("jorbis.player.playonstartup");
			if(s!=null && s.equals("yes"))
				playonstartup=true; 
		}

		String c = getParameter("jorbis.player.bgcolor");

		try {
			bgColor = new Color(Integer.parseInt(c));
		} catch (Exception e) {}

		System.out.println("Bg-color: specified: " +c + ", using: " +  bgColor.toString());

		initUI();

		getContentPane().setLayout(new BorderLayout());
		getContentPane().add(panel);
		setBackground(bgColor);
		repaint();

	}

	public void start(){
		super.start();
		if(playonstartup){
			play_sound(); 
		}
	}    

	void init_jorbis(){
		oy=new SyncState();
		os=new StreamState();
		og=new Page();
		op=new Packet();

		vi=new Info();
		vc=new Comment();
		vd=new DspState();
		vb=new Block(vd);

		buffer=null;
		bytes=0;

		oy.init();
	}

	public void closeOutputLine() {
		if(outputLine!=null){
			//outputLine.drain();
			outputLine.stop();
			outputLine.flush();
			outputLine.close();
			outputLine = null;
		}
	}

	public void closeBitStream() {
		if(bitStream!=null) {
			try {
				bitStream.close();
			} catch(Exception ee) {}
		}
	}

	SourceDataLine getOutputLine(int channels, int rate) throws Exception {
		if(outputLine==null || this.rate!=rate || this.channels!=channels){
			closeOutputLine();
			init_audio(channels, rate);
			outputLine.start();
		}
		return outputLine;
	}

	void init_audio(int channels, int rate) throws Exception {
		try {

			AudioFormat audioFormat = 
				new AudioFormat((float)rate, 
						16,
						channels,
						true,  // PCM_Signed
						false  // littleEndian
				);
			DataLine.Info info = 
				new DataLine.Info(SourceDataLine.class,
						audioFormat, 
						AudioSystem.NOT_SPECIFIED);
			if (!AudioSystem.isLineSupported(info)) {
				//System.out.println("Line " + info + " not supported.");
				return;
			}

			try{
				outputLine = (SourceDataLine) AudioSystem.getLine(info);
				//outputLine.addLineListener(this);
				outputLine.open(audioFormat);
			} catch (LineUnavailableException ex) { 
				System.out.println("Unable to open the sourceDataLine: " + ex);
				if(acontext != null)
					acontext.showStatus("Streaming applet: unable to open output device");
				throw ex;
			} 

			frameSizeInBytes = audioFormat.getFrameSize();
			int bufferLengthInFrames = outputLine.getBufferSize()/frameSizeInBytes/2;
			bufferLengthInBytes = bufferLengthInFrames * frameSizeInBytes;

			this.rate=rate;
			this.channels=channels;
		}
		catch(Exception ee){
			System.out.println(ee);
			closeOutputLine();
			throw ee;
		}
	}
	
	private void play_stream(Thread me) {

		boolean chained=false;

		init_jorbis();

		retry=RETRY;

		loop:
			while(true){
				int eos=0;

				int index=oy.buffer(BUFSIZE);
				buffer=oy.data;
				try{ 
					bytes=bitStream.read(buffer, index, BUFSIZE); 
				}
				catch(Exception e){
					System.err.println(e);
					return;
				}
				oy.wrote(bytes);

				if(chained){
					chained=false;
				}
				else {
					if(oy.pageout(og)!=1){
						if(bytes<BUFSIZE)break;
						System.err.println("Input does not appear to be an Ogg bitstream.");
						return;
					}
				}
				os.init(og.serialno());
				os.reset();

				vi.init();
				vc.init();

				if(os.pagein(og)<0){ 
					// error; stream version mismatch perhaps
					System.err.println("Error reading first page of Ogg bitstream data.");
					return;
				}

				retry=RETRY;

				if(os.packetout(op)!=1){ 
					// no page? must not be vorbis
					System.err.println("Error reading initial header packet.");
					break;
				}

				if(vi.synthesis_headerin(vc, op)<0){ 
					// error case; not a vorbis header
					System.err.println("This Ogg bitstream does not contain Vorbis audio data.");
					return;
				}

				int i=0;

				while(i<2){
					while(i<2){
						int result=oy.pageout(og);
						if(result==0) break; // Need more data
						if(result==1){
							os.pagein(og);
							while(i<2){
								result=os.packetout(op);
								if(result==0)break;
								if(result==-1){
									System.err.println("Corrupt secondary header.  Exiting.");
									//return;
									break loop;
								}
								vi.synthesis_headerin(vc, op);
								i++;
							}
						}
					}

					index=oy.buffer(BUFSIZE);
					buffer=oy.data; 
					try{ bytes=bitStream.read(buffer, index, BUFSIZE); }
					catch(Exception e){
						System.err.println(e);
						return;
					}
					if(bytes==0 && i<2){
						System.err.println("End of file before finding all Vorbis headers!");
						return;
					}
					oy.wrote(bytes);
				}

				{
					byte[][] ptr=vc.user_comments;
					StringBuffer sb=null;
					if(acontext!=null) sb=new StringBuffer();
					String artist = null, title = null, album = null, tmp;
					for(int j=0; j<ptr.length;j++){
						if(ptr[j]==null) break;
						tmp = new String(ptr[j], 0, ptr[j].length-1);
						System.err.println("Comment: "+tmp);
						if(sb!=null) {
							if(tmp.startsWith("ARTIST")) 
								artist = new String(ptr[j], 7, ptr[j].length-8);
							else if(tmp.startsWith("TITLE"))
								title = new String(ptr[j], 6, ptr[j].length-7);
							else if(tmp.startsWith("ALBUM"))
								album = new String(ptr[j], 6, ptr[j].length-7);
							else
								sb.append(" "+tmp);
						}
					} 
					System.err.println("Bitstream is "+vi.channels+" channel, "+vi.rate+"Hz");
					System.err.println("Encoded by: "+new String(vc.vendor, 0, vc.vendor.length-1)+"\n");
					if(acontext!=null) {
						StringBuffer stat = new StringBuffer();
						if(title!=null) {
							stat.append(title);
							if(album!=null) {
								stat.append(" on ");
								stat.append(album);
							}

						}
						else if(album!=null){ // hmm
							stat.append("Album ");
							stat.append(album);
						}
						
						if(artist!=null) {
							stat.append(" by ");
							stat.append(artist);
						}
						
						if(sb.length()>0)
							stat.append(" " +sb);
						acontext.showStatus(stat.toString());
					}
				}

				convsize=BUFSIZE/vi.channels;

				vd.synthesis_init(vi);
				vb.init(vd);

				float[][][] _pcmf=new float[1][][];
				int[] _index=new int[vi.channels];

				try {
					getOutputLine(vi.channels, vi.rate);
				} catch(Exception e) {
					stop_sound();
					return;
				}

				while(eos==0){
					while(eos==0){

						if(player!=me){
							System.err.println("player!=me bye.");
							closeBitStream();
							closeOutputLine();
							if(acontext!=null)
								acontext.showStatus("");
							return;
						}

						int result=oy.pageout(og);
						if(result==0)break; // need more data
						if(result==-1){ // missing or corrupt data at this page position
							//System.err.println("Corrupt or missing data in bitstream; continuing...");
						}
						else{
							os.pagein(og);

							if(og.granulepos()==0){  //
								chained=true;          //
								eos=1;                 // 
								break;                 //
							}                        //

							while(true){
								result=os.packetout(op);
								if(result==0)break; // need more data
								if(result==-1){ 
									// missing or corrupt data at this page position
								}
								else{
									// we have a packet.  Decode it
									int samples;
									if(vb.synthesis(op)==0){ // test for success!
										vd.synthesis_blockin(vb);
									}
									while((samples=vd.synthesis_pcmout(_pcmf, _index))>0){
										float[][] pcmf=_pcmf[0];
										int bout=(samples<convsize?samples:convsize);

										// convert doubles to 16 bit signed ints (host order) and
										// interleave
										for(i=0;i<vi.channels;i++){
											int ptr=i*2;
											//int ptr=i;
											int mono=_index[i];
											for(int j=0;j<bout;j++){
												int val=(int)(pcmf[i][mono+j]*32767.);
												if(val>32767){
													val=32767;
												}
												if(val<-32768){
													val=-32768;
												}
												if(val<0) val=val|0x8000;
												convbuffer[ptr]=(byte)(val);
												convbuffer[ptr+1]=(byte)(val>>>8);
												ptr+=2*(vi.channels);
											}
										}
										outputLine.write(convbuffer, 0, 2*vi.channels*bout);
										vd.synthesis_read(bout);
									}	  
								}
							}
							if(og.eos()!=0)eos=1;
						}
					}

					if(eos==0){
						index=oy.buffer(BUFSIZE);
						buffer=oy.data;
						try{ bytes=bitStream.read(buffer,index,BUFSIZE); }
						catch(Exception e){
							System.err.println(e);
							closeOutputLine();
							return;
						}
						if(bytes==-1){
							break;
						}
						oy.wrote(bytes);
						if(bytes==0)eos=1;
					}
				}

				os.clear();
				vb.clear();
				vd.clear();
				vi.clear();
			}

		closeOutputLine();
		oy.clear();
		if(acontext!=null)
			acontext.showStatus("");

		closeBitStream();
	}

	public void stop(){
		if(player==null){
			closeOutputLine();
			closeBitStream();
		}
		player=null;
	}

	Vector playlist=new Vector();

	public void actionPerformed(ActionEvent e){
		String command=((JButton)(e.getSource())).getText();
		if(command.equals(PLAY) && player==null){ 
			play_sound();
		}
		else if(player!=null){
			stop_sound();
		}
	}
	
	private void playFromOwnThread() {
		synchronized(playThread) {
			playThread.notify();
		}
	}

	private void playFromThisThread() {
		if(player!=null) 
			return;
		/*player=new Thread(this);
		player.start();*/
		// todo
		start_button.setText(STOP); 
		String item=getShoutSource();
		if(item==null) {
			stop_sound();
			return;
		}
		bitStream=selectSource(item);
		player = Thread.currentThread();
		if(bitStream!=null){
			play_stream(player);
		}
		else System.out.println("Bitstream is null");
		bitStream=null;
		
		stop_sound();
	}


	/* hooks */

	public boolean isPlaying() {
		return player != null;
	}

	public void play_sound(){
		playFromOwnThread();
	}

	public void stop_sound(){
		player=null;
		start_button.setText(PLAY);

	}
	
	InputStream selectSource(String item){
		if(item.endsWith(".pls")){
			item=fetch_pls(item);
			if(item==null) return null;
			//System.out.println("fetch: "+item);
		}
		else if(item.endsWith(".m3u")){
			item=fetch_m3u(item);
			if(item==null)return null;
			//System.out.println("fetch: "+item);
		}

		if(!item.endsWith(".ogg")){
			return null;  
		}

		InputStream is=null;
		URLConnection urlc=null;
		try{
			URL url=null;
			url=new URL(getCodeBase(), item);
			urlc=url.openConnection();
			urlc.setRequestProperty("Pragma", "no-cache");
			urlc.setUseCaches(false);
			is=urlc.getInputStream();
			current_source=url.getProtocol()+"://"+url.getHost()+":"+url.getPort()+url.getFile();
		}
		catch(Exception ee){
			System.err.println(ee); 	    
		}

		if(is==null) {
			System.out.println("Selected input stream is null");
			return null;
		}

		System.out.println("Select: "+item);
		return is;
	}

	String fetch_pls(String pls){
		InputStream pstream=null;
		if(pls.startsWith("http://")){
			try{
				URL url=null;
				url=new URL(getCodeBase(), pls);
				 urlc=url.openConnection();
				pstream=urlc.getInputStream();
			}
			catch(Exception ee){
				System.err.println(ee); 	    
				return null;
			}
		}

		String line=null;
		while(true){
			try{line=readline(pstream);}catch(Exception e){}
			if(line==null)break;
			if(line.startsWith("File1=")){
				byte[] foo=line.getBytes();
				int i=6;
				for(;i<foo.length; i++){
					if(foo[i]==0x0d)break;
				}
				return line.substring(6, i);
			}
		}
		return null;
	}

	String fetch_m3u(String m3u){
		InputStream pstream=null;
		if(m3u.startsWith("http://")){
			try{
				URL url=null;
				url=new URL(getCodeBase(), m3u);
				
				URLConnection urlc=url.openConnection();
				pstream=urlc.getInputStream();
			}
			catch(Exception ee){
				System.err.println(ee); 	    
				return null;
			}
		}

		String line=null;
		while(true){
			try{line=readline(pstream);}catch(Exception e){}
			if(line==null)break;
			return line;
		}
		return null;
	}


	void loadPlaylist(){
		String s=null;
		for(int i=0; i<10; i++){
			s=getParameter("jorbis.player.play."+i);
			System.out.println("Play" + i + ": " + s);
			if(s==null)
				break;
			playlist.addElement(s);
		} 
	}

	private String readline(InputStream is) {
		StringBuffer rtn=new StringBuffer();
		int temp;
		do {
			try { 
				temp=is.read();
			}
			catch(Exception e) {
				return null;
			}
			if(temp==-1) 
				return null;
			if(temp!=0 && temp!='\n')
				rtn.append((char)temp);
		}while(temp!='\n');                                                        
		return(rtn.toString());
	}

	public JOrbisPlayer(){
	}

	JPanel panel;
	JButton start_button;

	void initUI(){
		panel=new JPanel();

		start_button=new JButton(PLAY);
		start_button.addActionListener(this);
		panel.add(start_button);
		panel.setBackground(bgColor);
	}
	
	public String getShoutSource() {
		try {
			return (String)playlist.firstElement();
		}
		catch(NoSuchElementException e) { 
			return null;
		}
	}
	
	/* since js don't have proper access right's we'll need a seperate watcher thread */
	public class PlayWatch extends Thread {
		
		public PlayWatch() { }
		
		public void run() {
			while(true) {
				synchronized(this) {
					try {
						this.wait();
					}catch (InterruptedException e) {}
				}
				playFromThisThread();
			}
		}
	}
}
