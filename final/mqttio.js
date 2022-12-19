var port=9001 // mosquitto의 디폴트 웹 포트
var client =null; // null이면 연결되지 않았음
var canvas;
var context;
var img;

//load 이벤트 리스너 등록, 웹 페이지 로딩 후 실행
window.addEventListener("load", function(){
	canvas = document.getElementById("myCanvas");
	context = canvas.getContext("2d");
	img = new Image();
	img.onload=function(){
	    context.drawImage(img, 0, 0, 700, 400); // (0, 0)위치에 img의 크기로 그리기
	}
});

// drawImage()는 "image' 토픽이 도착하였을 때 onMessageArrived()에 의해 호출된다.
function drawImage(imgUrl){ // imgUrl은 이미지의 url
	img.src=imgUrl; // img.onload에 등록된 코드에 의해 그려짐
}
function startConnect(){ // 접속을 시도하는 함수
	console.log("startConnect")
	clientID = "clientID-" + parseInt(Math.random() * 100); // 랜덤한 사용자 ID 생성
	// 사용자가 입력한 브로커의 IP주소와 포트 번호 알아내기
	broker=document.getElementById("broker").value; // 브로커의 IP 주소
	// id가 message인 DIV 객체에 브로커의 IP와 포트 번호 출력
	// MQTT 메시지 전송 기능을 모두 가진 Paho client 객체 생성
	client=new Paho.MQTT.Client(broker, Number(port), clientID);
	//client 객체에 콜백 함수 등록
	// 접속이 끊어졌을 때 실행되는 함수 등록
	client.onConnectionLost=onConnectionLost; 
	//메시지가 도착하였을 때 실행되는 함수 등록
	client.onMessageArrived=onMessageArrived;
	//브로커에 접속, 객체의 프로퍼티는 onSuccess이고 그 값이 onConnect
	//접속에 성공하면 onConnect 함수를 실행
	client.connect({onSuccess:onConnect});
}
var isConnected=false;
//브로커 접속이 성공했을 때 호출되는 함수
function onConnect(){
	isConnected=true;
	console.log('onConnect');
	document.getElementById("ConnectMessage").innerHTML='<span>연결 시작</span><br>';

	//led와 카메라를 끈다.
	document.getElementById("ledOff").checked = true;
	document.getElementById("cameraOff").checked = true;
	publish('ledChange', '0');
	publish('cameraChange', 'cameraOff');

	//연결 성공 후 토픽들을 subscribe
	subscribe("temp");
	subscribe("humi");
	subscribe("lux");
	subscribe("camera");
	subscribe("state");
}

var topicSave;
function subscribe(topic){
	if(client == null) return;
	if(isConnected != true){
	    topicSave = topic;
	    window.setTimeout("subscribe(topicSave)", 500);
	    return;
	}
	client.subscribe(topic) // 브로커에 subscribe
}

function publish(topic, msg){
	if(client == null) return; // 연결되지 않음
	client.send(topic, msg, 0, false);
}
function unsubscribe(topic){
	if(client == null || isConnected != true) return;
	client.unsubscribe(topic, null);
}
//접속이 끊어졌을 때 호출되는 함수
function onConnectionLost(responseObject){
	if (responseObject.errorCode !== 0) {
	    document.getElementById("ConnectMessage").innerHTML += '<span>오류 : '
	    + responseObject.errorMessage + '</span><br/>';
	}
}
// 메시지가 도착할 때 호출되는 함수
function onMessageArrived(msg) { // 매개변수 msg는 도착한 MQTT 메시지를 담고 있는 객체
	//console.log("onMessageArrived: " + msg.payloadString);
	// 토픽 camera가 도착하면 payload에 담긴 파일 이름의 이미지 그리기
	if(msg.destinationName == "camera") { drawImage(msg.payloadString); }
	// 토픽 state가 도착하면 화재상황인지 아닌지 판단
	if(msg.destinationName == "state"){
	    var info = document.getElementById("fire_info");
	    var h2 = document.getElementById("h2");
	    var t = document.getElementById("nowTime");
	    var sm = document.getElementById ("StateMessage")
	    var stateSafe = false
	    var stateFire = false

	    if(msg.payloadString == "safe"){ // 화재 상황이 아닐 경우 스타일 조작
	        console.log("safe");
	        if(stateSafe == false){
		sm.innerHTML='<span>안전</span><br>';
		sm.style.color="black"
	       	document.body.style.backgroundColor="lightgreen";
	        	info.style.display="none";
	                        
	        	h2.style.animationName="";
	        	h2.innerHTML = "라즈베리파이를 활용한 화재경보기";
	        	t.style.color="black";
		stateSafe = true;
		stateFire = false;
	        }	      
	    } 
	    
	    else if(msg.payloadString == "fire"){ // 화재 상황시 스타일 조작
	        console.log("fire")
	        if(stateFire == false){
		sm.innerHTML='<span>화재 발생!</span><br>';
		sm.style.color="yellow"
	        	document.body.style.backgroundColor="red";  
	        	info.style.display="block";

	        	h2.style.animationName="fireAnimation";
	        	h2.style.animationDuration="1s";
	        	h2.style.animationIterationCount="infinite";
	        	h2.innerHTML = "화재 발생! 대피하세요";
	      	t.style.color="yellow";
		stateFire = true;
		stateSafe = false;
	        }                   
	    }
	}
	if (msg.destinationName =="temp"){
		console.log("temp");
	//온습도는 Math.round()함수를 사용해 소수점없이 나타내준다
		document.getElementById("temp").innerHTML='<span>' + '온도: ' + Math.round (msg.payloadString) + '°C</span><br>';
	} else if (msg.destinationName == "humi"){
		document.getElementById("humi").innerHTML='<span>' + '습도:  '+ Math.round (msg.payloadString) + '%</span><br>';
	} else  if (msg.destinationName == "lux"){
		document.getElementById("lux").innerHTML='<span>' + '조도:  '+ msg.payloadString + '</span><br>';
	}
}
// disconnection 버튼이 선택되었을 때 호출되는 함수
function startDisconnect() {
	    unsubscribe("temp");
	    unsubscribe("humi");
	    unsubscribe("lux");
	    unsubscribe("camera");
	    unsubscribe("state");

	    client.disconnect(); // 브로커에 접속 해제
	    document.getElementById("ConnectMessage").innerHTML = '<span>연결 종료</span><br>';
	    console.log("disConnect")
}
