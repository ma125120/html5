navigator.getUserMedia || 
    (navigator.getUserMedia = navigator.mozGetUserMedia ||  navigator.webkitGetUserMedia || navigator.msGetUserMedia);
 if (navigator.getUserMedia) {
    navigator.getUserMedia({
    video: true,
    audio: true
}, function(stream) {
	getVideo(stream);
	//getAudio(stream);
   var dataChannelOptions = {
		  ordered: false, // do not guarantee order
		  maxRetransmitTime: 3000, // in milliseconds
		};

var peerConnection = new RTCPeerConnection();

// Establish your peer connection using your signaling channel here
var dataChannel =
  peerConnection.createDataChannel("myLabel1", dataChannelOptions);

setInterval(()=>{
console.log(dataChannel.readyState);
},1000);
dataChannel.onerror = function (error) {
  console.log("Data Channel Error:", error);
};

dataChannel.onmessage = function (event) {
  console.log("Got Data Channel Message:", event.data);
};

dataChannel.onopen = function () {
	console.log("已经打开")
  dataChannel.send("Hello World!");
};

dataChannel.onclose = function () {
  console.log("The Data Channel is Closed");
};
}, function() {
	console.log("调用失败");
});
} else {
    console.log('your browser not support getUserMedia');
}

function getVideo(stream) {
	var video = document.getElementById('webcam');

    if (window.URL) {
        video.srcObject = stream
    } else {
        video.src = stream;
    }

    video.autoplay = true;
    //or video.play();
}

function getAudio(stream) {
	//创建一个音频环境对像
    audioContext = window.AudioContext || window.webkitAudioContext;
    context = new audioContext();
    console.log(context)
    //将声音输入这个对像
    audioInput = context.createMediaStreamSources(stream);
    
    //设置音量节点
    volume = context.createGain();
    audioInput.connect(volume);

    //创建缓存，用来缓存声音
    var bufferSize = 2048;

    // 创建声音的缓存节点，createJavaScriptNode方法的
    // 第二个和第三个参数指的是输入和输出都是双声道。
    recorder = context.createJavaScriptNode(bufferSize, 2, 2);

    // 录音过程的回调函数，基本上是将左右两声道的声音
    // 分别放入缓存。
    recorder.onaudioprocess = function(e){
        console.log('recording');
        var left = e.inputBuffer.getChannelData(0);
        var right = e.inputBuffer.getChannelData(1);
        // we clone the samples
        leftchannel.push(new Float32Array(left));
        rightchannel.push(new Float32Array(right));
        recordingLength += bufferSize;
    }

    // 将音量节点连上缓存节点，换言之，音量节点是输入
    // 和输出的中间环节。
    volume.connect(recorder);

    // 将缓存节点连上输出的目的地，可以是扩音器，也可以
    // 是音频文件。
    recorder.connect(context.destination);
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
}

function onAnswer(evt) {
    console.log("接收到Answer。。。");
    console.log(evt);
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
}

function sendCandidate(candidate) {
    var text=JSON.stringify(candidate);

    textForSendICE.value=(textForSendICE.value+CR+iceSeparator+CR+text+CR);
    textForSendICE.scrollTop=textForSendICE.scrollHeight;
}

//-------视频处理-------
function startVideo() {
    navigator.webkitGetUserMedia({
        video:true,
        audio:false
    },function(stream) {
        localStream=stream;
        localVideo.srcObject=stream;
        localVideo.play();
    },function(err) {
        console.log('发生了一个错误,错误代码为'+err.code);
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
1
    } catch(e) {
        console.log("建立连接失败,错误:"+e.message);
    }
    //发送所有ICE候选者给对方
    peer.onicecandidate=function(evt) {
        if(evt.candidate) {
            sendCandidate({
                type:'candidate',
                sdpMLineIndex:evt.candidate.sdpMLineIndex,
                sdpMid:evt.candidate.sdpMid,
                candidate:evt.candidate.candidate
            });
            console.log("添加本地视频流到远程...");
            peer.addStream(localStream);

            peer.onaddstream=onRemoteStreamAdded;
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
    console.log(peerConnection)
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