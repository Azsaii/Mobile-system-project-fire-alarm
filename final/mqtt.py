#publisher

import time
import paho.mqtt.client as mqtt
import circuit

flag = False
onOff = False

def on_connect(client, userdata, flag, rc):	# 연결시 호출되는 함수
	print("mqtt connected")
	client.subscribe("ledChange", qos = 0)
	client.subscribe("cameraChange", qos = 0)

def on_message(client, userdata, msg):	# 메시지가 오면 호출되는 함수
	# 카메라 image 코드
	global flag
	global onOff
	command = msg.payload.decode("utf-8")
	if command == "cameraOn" :      # 카메라 촬영 command가 오면
		print("camera on msg received.")
		flag = True
	elif command == "cameraOff" :
		print("carema off msg received.")
		flag = False

	# LED 코드
	else:   # LED on/off 메시지가 오면
		onOff = int(msg.payload)
		if onOff == 1:
			print("LED on msg received.")
		elif onOff == 0:
			print("LED off msg received.")

#연결을 위한 코드
broker_ip = "localhost"	# 현재 라즈베리파이를 broker로 설정

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(broker_ip, 1883)
client.loop_start()

while True:
	if flag==True:
		imageFileName = circuit.takePicture() # camera 동영상 찍는 함수
		client.publish("camera", imageFileName, qos=0)    # 이미지 publish

	temp = circuit.getTemperature()
	humi = circuit.getHumidity()
	lux = circuit.getLux()
	
	circuit.controlLED(temp, onOff)
	time.sleep(0.0001)
	
	if (temp >= 50): # 온도가 50도 이상이면
		client.publish("state", "fire", qos=0)  # "fire"메시지로 화재 상황임을 알린다.
	else: 
		client.publish("state", "safe", qos=0)  # "safe"메시지로 평상시 상황임을 알린다.

	client.publish("temp", temp, qos=0) # 온도 정보 publish
	client.publish("humi", humi, qos=0) # 습도 정보 publish
	client.publish("lux", lux, qos=0) # 조도 정보 publish


client.loop_stop()
client.disconnect()