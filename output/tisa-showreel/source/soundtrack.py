"""Original 120-BPM electronic score. No samples, libraries, or external music."""
from pathlib import Path
import wave
import numpy as np

RATE=48000
DURATION=30
rng=np.random.default_rng(741020)
mix=np.zeros((RATE*DURATION,2),dtype=np.float64)
def add(signal,at,gain=1,pan=0):
    start=int(at*RATE)
    if start<0:return
    length=min(len(signal),len(mix)-start)
    if length<=0:return
    mix[start:start+length,0]+=signal[:length]*gain*np.sqrt((1-pan)/2)
    mix[start:start+length,1]+=signal[:length]*gain*np.sqrt((1+pan)/2)
def kick(at,gain=1):
    t=np.arange(int(.43*RATE))/RATE
    f=48+108*np.exp(-t*38)
    phase=2*np.pi*np.cumsum(f)/RATE
    s=np.sin(phase)*np.exp(-t*11)+rng.normal(size=len(t))*.2*np.exp(-t*170)
    add(s,at,gain)
def hat(at,gain=.1,pan=0,opened=False):
    t=np.arange(int((.19 if opened else .065)*RATE))/RATE
    n=rng.normal(size=len(t));n=np.diff(n,prepend=0)
    add(n*np.exp(-t*(28 if opened else 85)),at,gain,pan)
def snare(at,gain=.28):
    t=np.arange(int(.22*RATE))/RATE
    n=rng.normal(size=len(t));n=n-np.convolve(n,np.ones(12)/12,'same')
    s=n*np.exp(-t*23)+np.sin(2*np.pi*185*t)*np.exp(-t*32)*.8
    add(s,at,gain)
def note(at,freq,duration=.35,gain=.17,pan=0):
    t=np.arange(int(duration*RATE))/RATE
    env=np.minimum(t/.008,1)*np.exp(-t*8)*np.minimum((duration-t)/.04,1)
    s=(np.sin(2*np.pi*freq*t)+.23*np.sin(2*np.pi*2*freq*t)+.11*np.sin(2*np.pi*3*freq*t))*env
    add(s,at,gain,pan)
    add(s,at+.25,gain*.19,-pan)
def impact(at):
    kick(at,.9)
    t=np.arange(int(.85*RATE))/RATE
    add((np.sin(2*np.pi*(56*t-14*t*t))+np.sin(2*np.pi*111*t)*.2)*np.exp(-t*6),at,.45)
    noise=rng.normal(size=len(t));noise=np.convolve(noise,np.ones(30)/30,'same')
    add(noise*np.exp(-t*7),at,.28)
def whoosh(at):
    t=np.arange(int(.4*RATE))/RATE
    noise=rng.normal(size=len(t));noise=np.convolve(noise,np.ones(10)/10,'same')
    envelope=np.sin(np.pi*np.clip(t/.4,0,1))**2
    add(noise*envelope,at,.22,-.55);add(noise[::-1]*envelope,at+.04,.16,.55)

# Sparse opening, body groove, conversion build, then a clean brand resolve.
for beat in range(60):
    at=beat*.5
    if at<26:
        kick(at,.52 if at<3 else .75)
        if beat%2:snare(at,.24 if at<22 else .31)
        if at>=3:
            hat(at+.25,.073,(-1 if beat%2 else 1)*.35,beat%4==3)
            hat(at,.037,.15)
        if 22<=at<26:
            hat(at+.125,.045,-.5);hat(at+.375,.052,.5)
        bass=[73.416,73.416,65.406,58.270][(beat//4)%4]
        if at>=3:note(at+.02,bass,.42,.28)
        if 6<=at<26:
            notes=[293.665,440,349.228,523.251,293.665,587.33,440,349.228]
            note(at+.25,notes[beat%8],.32,.055,(-1 if beat%2 else 1)*.5)
for at in [0,1.5,3,6,10,14,18,22,26]:
    impact(at)
    if at:whoosh(at-.22)
for at in [5.5,9.5,13.5,17.5,21.5,25.5]:
    for j in range(4):hat(at+j*.125,.07,(-1 if j%2 else 1)*.5)
for f in [146.832,220,293.665,349.228]:note(26.1,f,2.6,.16)
t=np.arange(int(3.8*RATE))/RATE
pad=(np.sin(2*np.pi*146.832*t)+np.sin(2*np.pi*220*t)*.5+np.sin(2*np.pi*293.665*t)*.4)*np.exp(-t*1.2)
add(pad,26.1,.21)
master=np.tanh(mix*1.1)
master*=.89/max(np.max(np.abs(master)),1e-8)
fade=np.minimum(np.arange(len(master))/RATE/.025,1)*np.minimum((len(master)-1-np.arange(len(master)))/RATE/.6,1)
master*=fade[:,None]
out=Path(__file__).resolve().parent.parent/'original-soundtrack.wav'
with wave.open(str(out),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((master*32767).astype('<i2').tobytes())
print(out)
