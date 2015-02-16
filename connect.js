//Black magic
NodeList.prototype.forEach = Array.prototype.forEach;

navigator.getUserMedia = navigator.webkitGetUserMedia;

var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

var RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate || window.webkitRTCIceCandidate;
//Global variables
var users = {
	phineas: {
		jid: 'phineas@yuanshuo.me',
		password: '19910202a'
	},
	joe: {
		jid: 'joe@yuanshuo.me',
		password: '19910202a'
	}
};

var config = {
	'iceServers': [{
		'url': 'stun:stun.l.google.com:19302'
	}]
};

var xmppClient;
var pc;

document.querySelectorAll('button').forEach(function(button){
	button.onclick = function(){
		if (this.id === 'start') {
			//start a RTC
			start(true);
		} else{
			//log in
			xmppClient = new Strophe.Connection('http://yuanshuo.me:5280/http-bind/');

			xmppClient.connect(users[this.id].jid, users[this.id].password, function(status){
				if (status === Strophe.Status.CONNECTED) {
					//broadcast presence
					xmppClient.send($pres({}));

					//on message
					xmppClient.addHandler(function(msg){
						var body = msg.getElementsByTagName('body')[0];
						if (body){
							onMessage(body.textContent);
						}

						return true;
					}, null, 'message');

					alert('log in success');
				}
			});

			//hide login button
			document.querySelectorAll('.login').forEach(function(login){
				login.style.display = 'none';
			});
			document.title = this.id;

		}
	};
});

//Message system
function send(body){
	var to = document.title === 'phineas' ? 'joe@yuanshuo.me' : 'phineas@yuanshuo.me';

	var msg = $msg({
		to: to,
		type: 'chat'
	})
	.cnode(Strophe.xmlElement('body', body)).up()
	.c('active', {xmlns: 'http://jabber.org/protocol/chatstates'});

	xmppClient.send(msg);
}

function onMessage(msg){
	//as receiver
	if (!pc) start(false);

	msg = JSON.parse(msg);

	if (msg.sdp) {
		//handle sdp
		pc.setRemoteDescription(new RTCSessionDescription(msg.sdp), function(){
			if (pc.remoteDescription.type === 'offer'){
				pc.createAnswer(localDescCreated);
			}
		});
	} else {
		//add candidate
		pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
	}
}

//Start
function start(isSender){
	pc = new RTCPeerConnection(config);

	pc.onicecandidate = function(event){
		if (isSender && event.candidate){
			send(JSON.stringify({
				'candidate': event.candidate
			}));
		}
	};

	pc.onnegotiationneeded = function (){
		if (isSender){
			pc.createOffer(localDescCreated, null, {
				mandatory: {
					OfferToReceiveAudio: true,
					OfferToReceiveVideo: true
				}
			});
		}
	};

	pc.onaddstream = function(event) {
		document.querySelector('#remote').src = URL.createObjectURL(event.stream);
	};

	navigator.getUserMedia({
		'audio': true,
		'video': true
	}, function(stream){
		document.querySelector('#local').src = URL.createObjectURL(stream);
		pc.addStream(stream);
	}, function(err){
		console.log(err);
	});
}

function localDescCreated(desc){
	pc.setLocalDescription(desc, function(){
		send(JSON.stringify({
			'sdp': pc.localDescription
		}));
	});
}
