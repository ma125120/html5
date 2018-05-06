navigator.getUserMedia=navigator.getUserMedia||navigator.webkitGetUserMedia||window.navigator.mozGetUserMedia;
window.URL=window.URL||window.webkitURL;
if(navigator.mozGetUserMedia) {
	RTCPeerConnection=mozRTCPeerConnection;
	RTCSessionDescription=mozRTCSessionDescription;
	RTCIceCandidate=mozRTCIceCandidate;
} else if(navigator.webkitGetUserMedia) {
	RTCPeerConnection=webkitRTCPeerConnection;
} else {
	alert("您的浏览器不支持WebRTC通信");
}

var localVideo=document.getElementById("local-video");
var remoteVideo=document.getElementById("remote-video");
var localStream=null;
var peerConnection=null;
var peerStarted=false;
var mediaConstraints={
	"mandatory":{
		"OfferToReceiveAudio":false,
		"OfferToReceiveVideo":true
	}
};

var textForSendSDP=document.getElementById("text-for-send-sdp");
var textForSendICE=document.getElementById("text-for-send-ice");
var textToReceiveSDP=document.getElementById("text-for-receive-sdp");
var textToReceiveICE=document.getElementById("text-for-receive-ice");
var iceSeparator="---ICE候选者---";
var CR=String.fromCharCode(13);

//--socket---
var socketReady=false;
var port=3006;
var socket=io.connect("http://localhost:"+port+"/");
//建立socket连接
socket.on("connect",onOpened)
			.on("message",onMessage);

function onOpened(evt) {
	console.log("已建立socket连接");
	socketReady=true;
}
//socket消息处理
function onMessage(evt) {
	if(evt.type=="offer") {
		console.log("接收到offer,设置offer,发送answer。。。");
		onOffer(evt);
	} else if(evt.type=="answer"&&peerStarted) {
		console.log("接收到answer,set answer sdp");
		onAnswer(evt);
	} else if(evt.type=="candidate"&&peerStarted) {
		console.log('接收到ICE候选者');
		onCandidate(evt);
	} else if(evt.type=='bye'&&peerStarted) {
		console.log("webRTC通信断开");
		stop();
	}
}

//------------------交换信息----------
function onSDP() {
	var text=textToReceiveSDP.value;
	var evt=JSON.parse(text);
	if(peerConnection) {
		console.log("存在")
		onAnswer(evt);
	} else {
		onOffer(evt);
	}

	textToReceiveSDP.value="";
}

function onICE() {
	var text=textToReceiveICE.value;
	var arr=text.split(iceSeparator);
	for(var i=1,len=arr.length;i<len;i++) {
		var evt=JSON.parse(arr[i]);
		onCandidate(evt);
	}

	textToReceiveICE.value="";
}

function onOffer(evt) {
	console.log("即受到OFFER。。。");
	console.log(evt);
	setOffer(evt);
	sendAnswer(evt);
	peerStarted=true;
}

function onAnswer(evt) {
	console.log("接收到Answer。。。");
	setAnswer(evt);
}

function onCandidate(evt) {
	var candidate=new RTCIceCandidate({
		sdpMLineIndex:evt.sdpMLineIndex,
		sdpMid:evt.sdpMid,
		candidate:evt.candidate
	});
	console.log("接收到candidate。。。");
	peerConnection.addIceCandidate(candidate);
}

function sendSDP(sdp) {
	var text=JSON.stringify(sdp);
	console.log(text);

	textForSendSDP.value=text;
	//通过socket发送
	socket.json.send(sdp);
}

function sendCandidate(candidate) {
	var text=JSON.stringify(candidate);

	textForSendICE.value=(textForSendICE.value+CR+iceSeparator+CR+text+CR);
	textForSendICE.scrollTop=textForSendICE.scrollHeight;
	//通过socket发送
	socket.json.send(candidate);
}

//-------视频处理-------
function startVideo() {
	navigator.getUserMedia({
		video:true,
		audio:false
	},function(stream) {
		localStream=stream;
		localVideo.srcObject=stream;
		localVideo.play();
	},function(err) {
		console.log(err);
		return ;
	})
}

function stopVideo() {
	localVideo.src="";
}
//-----处理连接----
function prepareNewConnection() {
	var pc_config={
		"iceServers":[]
	};
	var peer=null;
	try {
		peer=new webkitRTCPeerConnection(pc_config);
	} catch(e) {
		console.log("建立连接失败,错误:"+e.message);
	}
	//发送所有ICE候选者给对方
	peer.onicecandidate=function(evt) {
		console.log(peer.getStats())
		if(evt.candidate) {
			sendCandidate({
				type:'candidate',
				sdpMLineIndex:evt.candidate.sdpMLineIndex,
				sdpMid:evt.candidate.sdpMid,
				candidate:evt.candidate.candidate
			});
			console.log("添加本地视频流到远程...");
			peer.addStream(localStream);

			peer.ontrack=onRemoteStreamAdded;
			peer.addEventListener("addstream",onRemoteStreamAdded,false);
			peer.addEventListener("removestream",onRemoveStreamRemoded,false);
			//当接收到远程视频流时，使用本地video元素进行显示
			function onRemoteStreamAdded(event) {
				console.log("添加远程视频流到本地");
				remoteVideo.srcObject=event.stream;
				remoteVideo.play();
			}
			//当结束远程通信时，取消本地video元素中的显示
			function onRemoveStreamRemoded(event) {
				console.log("结束远程");
				remoteVideo.src="";
				remoteVideo.stop();
			}
		}
	}
	return peer;
}

function sendOffer() {
	peerConnection=prepareNewConnection();
	//console.log(peerConnection)
	peerConnection.createOffer(function(sessionDescription) {
		peerConnection.setLocalDescription(sessionDescription);
		console.log("发送：SDP");
		sendSDP(sessionDescription);
	},function(err) {
		console.log("创建OFFER失败");
	},mediaConstraints);
}

function setOffer(evt) {
	if(peerConnection) {
		console.log('peerConnection已经存在');
	}
	peerConnection=prepareNewConnection();
	peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
	console.log(peerConnection)
}

function sendAnswer(evt) {
	console.log("发送answer");
	if(!peerConnection) {
		console.log('peerConnection不存在');
		return ;
	}

	peerConnection.createAnswer(function(sessionDescription) {
		peerConnection.setLocalDescription(sessionDescription);
		console.log("发送SDP");
		sendSDP(sessionDescription);
	},function() {
		console.log("创建Answer失败");
	},mediaConstraints);
}

function setAnswer(evt) {
	if(!peerConnection) {
		console.log("peerConnection不存在");
		return ;
	}
	peerConnection.setRemoteDescription(new RTCSessionDescription(evt));
}

//---处理用户UI事件----
function connect() {
	if(!peerStarted&&localStream) {
		sendOffer();
		peerStarted=true;
	} else if(!localStream) {
		alert("请首先捕获本地视频数据")
	}
}

function hangUp() {
	console.log("挂断");
	stop();
}

function stop() {
	peerConnection.close();
	peerConnection=null;
	peerStarted=false;
}