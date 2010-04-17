<?php
/* 
    Pitchfork Music Player Daemon Client
    Copyright (C) 2007  Roger Bystrøm

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; version 2 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/
	$error = false;
	$no_require_login = "true";
	require_once("../inc/base.php");
	if(isset($_POST['password'])) {
		$pass = get_config("login_pass");
		if(substr($pass,0, 4)=="sha:") {
			if(check_hash($pass, trim($_POST['password']))) {
				$_SESSION['logged_in'] = true;
				header("Location: index.php");
				exit(); 
			}
			$error = "Login failed";
		}
		else if($pass==trim($_POST['password'])) {
			$_SESSION['logged_in'] = true;
			header("Location: index.php");
			exit(); 
		}
		else {
			$error = "Login failed";
		}
	}
	else if(isset($_GET['logout'])) {
		session_destroy();
		header("Location: login.php");
		exit();
	}
?>
<html>
<head>
<title>Pitchfork login</title>
<meta name="robots" content="noindex,nofollow" />
<style type="text/css"> 
	body {
		text-align: center;
	}
	h1 {
		font-size: 18px; 
	}
	div.container {
		display: 	block;
		overflow: 	visible;
		padding: 	10px 25px 10px 25px;
		width:		500px;
		margin: 	0 auto;
		border: 	1px solid #B0BDEC; 
		background-color: #DEE7F7; 
	}
	p.error {
		border:		1px solid #a20000;
		background-color: #ffcccc;
		padding: 5px;
	}
</style>
</head>
<body onload="document.getElementById('password').focus();">
<div class='container'>
<h1>Pitchfork login</h1>
<?php
	if($error) {
		echo "<p class='error'>$error</p>";
	}
	if(isset($_SESSION['logged_in'])&&$_SESSION['logged_in']) {
		echo "<p>Already logged in. <a href='login.php?logout'>Log out?</a></p>\n";
	}
?>
	<form method="post" action="login.php">
		Password: <input type='password' id="password" name='password' />
		<input type='submit' name='submit' value='Log in'/>
	</form>
</div>
</body>
</html>
