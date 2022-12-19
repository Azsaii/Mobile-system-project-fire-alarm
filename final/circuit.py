import RPi.GPIO as GPIO
from adafruit_htu21d import HTU21D
import Adafruit_MCP3008
import busio
import os; import io; import time
import picamera
import cv2; import numpy as np

#LED를 위한 변수 선언 및 초기화
RLED = 19
YLED = 13
GLED = 6
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(RLED, GPIO.OUT)
GPIO.setup(YLED, GPIO.OUT)
GPIO.setup(GLED, GPIO.OUT)
GPIO.output(RLED, GPIO.LOW)
GPIO.output(YLED, GPIO.LOW)
GPIO.output(GLED, GPIO.LOW)

# 조도 측정을 위한 코드
mcp = Adafruit_MCP3008.MCP3008(clk=11, cs = 8, miso = 9, mosi = 10)

# 온습도 측정을 위한 코드
sda = 2
scl = 3
i2c = busio.I2C(scl, sda)
sensor = HTU21D(i2c)

#PWM 세팅
Rpwm = GPIO.PWM(RLED, 50)
Ypwm = GPIO.PWM(YLED, 50)
Gpwm = GPIO.PWM(GLED, 50)
Rpwm.start(0)
Ypwm.start(0)
Gpwm.start(0)

def controlLED(temp, onOff):
	#조도 구하기
	value = int(100-(mcp.read_adc(0)/10))
	if(value<0):
		value=0

	#LED Control
	if(onOff==0): #LED Off
		Gpwm.ChangeDutyCycle(0)
		Ypwm.ChangeDutyCycle(0)
		Rpwm.ChangeDutyCycle(0)

	else:  #LED 켜고 조도에 따라 DutyCycle 설정
		if(temp>=0 and temp<50): # 0도 이상이면 초록색 LED를 켠다.
			GPIO.output(RLED, GPIO.LOW)
			for duty in range(0, value):
				Gpwm.ChangeDutyCycle(duty)
				time.sleep(0.01)
			if(temp>=25): # 25도 이상이면 노란색 LED를 켠다.
				for duty in range(0, value):
					Ypwm.ChangeDutyCycle(duty)
					time.sleep(0.01)
		elif(temp>=50): # 50도 이상이면 화재 상황으로 간주, 빨간색 LED를 켠다.
			Gpwm.ChangeDutyCycle(0) # 초록색, 노란색 LED는 끈다.
			Ypwm.ChangeDutyCycle(0)
			GPIO.output(RLED, onOff)
			time.sleep(0.5)

def getTemperature(): # 온도 반환
	return float(sensor.temperature)

def getHumidity(): # 습도 반환
	return float(sensor.relative_humidity)

def getLux(): # 조도 반환
	return int(mcp.read_adc(0)/10)

#동영상 촬영하는 코드
fileName = ""
stream = io.BytesIO()
camera = None

def takePicture():
	global fileName, stream, camera
	camera = picamera.PiCamera(resolution=(640, 480), framerate=30)
	camera.start_preview()

	if len(fileName) != 0:
		os.unlink(fileName)
	stream.seek(0)
	stream.truncate()
	camera.capture(stream, format='jpeg', use_video_port=True)

	data = np.frombuffer(stream.getvalue(), dtype=np.uint8)
	image = cv2.imdecode(data, 1)
	image_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
	takeTime = time.time()
	fileName = "./static/%d.jpg" % (takeTime * 10)
	cv2.imwrite(fileName, image)
	camera.close()

	return fileName