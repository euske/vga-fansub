//  Caption
//
let displayTime: HTMLElement = null;
let stopAtOnfocus = true;

function clamp(v0: number, v: number, v1: number) {
    if (v < v0) {
	return v0;
    } else if (v < v1) {
	return v;
    } else {
	return v1;
    }
}

function tweenIn(dt: number, duration=1.0) {
    let v = dt / duration;
    if (v < 1.0) {
	return 1.0-v*v;
    } else {
	return 0;
    }
}

class Caption {
    
    elem: HTMLElement;
    t0: number = -1;
    t1: number = -1;
    x: number = 0.5;
    y: number = 0.5;
    anchor: string = null;
    tweenIn: string = null;
    tweenOut: string = null;
    
    constructor(elem: HTMLElement) {
	this.elem = elem;
	this.elem.hidden = true;
	this.elem.style.position = 'absolute';
	this.elem.style.visibility = 'visible';
    }
    
    toString() {
	return ('<Caption ('+this.t0+'-'+this.t1+')>');
    }
    
    getx(t: number) {
	if (this.tweenIn == 'L') {
	    return this.x - tweenIn(t-this.t0);
	}
	return this.x;
    }

    gety(t: number) {
	return this.y;
    }

    show() {
	this.elem.hidden = false;
    }
    
    hide() {
	this.elem.hidden = true;
    }

    update(bounds: ClientRect, t: number) {
	if (this.tweenIn !== null || this.tweenOut !== null) {
	    this.layout(bounds, t);
	}
    }

    layout(bounds: ClientRect, t: number) {
	let frame = this.elem.getBoundingClientRect();
	let dx = -frame.width/2;
	let dy = -frame.height/2;
	if (this.anchor !== null) {
	    if (0 <= this.anchor.indexOf('n')) {
		dy = 0;
	    } else if (0 <= this.anchor.indexOf('s')) {
		dy = -frame.height;
	    }
	    if (0 <= this.anchor.indexOf('w')) {
		dx = 0;
	    } else if (0 <= this.anchor.indexOf('e')) {
		dx = -frame.width;
	    }
	}
	let x = bounds.width*this.getx(t) + dx;
	let y = bounds.height*this.gety(t) + dy;
	if (this.tweenIn === null && this.tweenOut === null) {
	    x = clamp(0, x, bounds.width-frame.width);
	    y = clamp(0, y, bounds.height-frame.height);
	}
	this.elem.style.left = x+'px';
	this.elem.style.top = y+'px';
    }
}


//  Trigger
//
class Trigger {
    
    t: number;
    show: boolean;
    caption: Caption;
    
    constructor(t: number, show: boolean, caption: Caption) {
	this.t = t;
	this.show = show;
	this.caption = caption;
    }
    
    toString() {
	return ('<Trigger ('+this.t+'): show='+this.show+', caption='+this.caption+'>');
    }
}


//  Segment
//
class Segment {
    
    t: number = -1;
    captions: Caption[] = [];
    
    constructor(t: number, captions: Caption[]) {
	this.t = t;
	this.captions = captions;
    }

    toString() {
	return ('<Segment ('+this.t+'): captions='+this.captions+'>');
    }
}


//  CaptionScreen
// 
class CaptionScreen {
    
    video: HTMLVideoElement;
    bounds: ClientRect;
    segments: Segment[] = [];
    present: Caption[] = [];
    
    constructor(video: HTMLVideoElement) {
	this.video = video;
	this.resize();
    }

    focus() {
	if (stopAtOnfocus) {
	    this.video.play();
	}	
    }

    blur() {
	if (stopAtOnfocus) {
	    this.video.pause();
	}	
    }

    resize() {
	this.bounds = this.video.getBoundingClientRect();
	let t = this.video.currentTime;
	for (let caption of this.present) {
	    caption.layout(this.bounds, t);
	}
    }

    update() {
	let t = this.video.currentTime;
	let i0 = 0;
	let i1 = this.segments.length;
	let seg: Segment = null;
	if (displayTime !== null) {
	    let s = Math.floor(t*10).toString();
	    displayTime.innerHTML = s.substring(0,s.length-1)+'.'+s.substring(s.length-1);
	    console.log(displayTime.innerHTML);
	}
	for (let caption of this.present) {
	    caption.update(this.bounds, t);
	}
	while (i0 < i1) {
	    let i = Math.floor((i0+i1)/2);
	    let seg0 = this.segments[i];
	    let seg1 = this.segments[i+1];
	    if (t < seg0.t) {
		i1 = i;
	    } else if (seg1.t <= t) {
		i0 = i+1;
	    } else {
		// seg0.t <= t && t < seg1.t
		this.setCaptions(seg0.captions, t);
		break;
	    }
	}
    }

    setCaptions(captions: Caption[], t: number) {
	for (let i = this.present.length-1; 0 <= i; i--) {
	    let caption = this.present[i];
	    if (captions.indexOf(caption) < 0) {
		caption.hide();
		this.present.splice(i, 1);
	    }
	}
	for (let caption of captions) {
	    if (this.present.indexOf(caption) < 0) {
		caption.show();
		caption.layout(this.bounds, t);
		this.present.push(caption);
	    }
	}
    }
}

// splitParams
function splitParams(s: string) {
    if (s !== null) {
	let i = Math.max(s.indexOf(','), s.indexOf('-'), s.indexOf(' '));
	if (0 <= i) {
	    let t0 = parseFloat(s.substr(0, i));
	    let t1 = parseFloat(s.substr(i+1))
	    return [t0, t1];
	}
    }
    return null;
}

// hookVideo
function hookVideo(video: HTMLVideoElement, interval=50) {
    let screen = new CaptionScreen(video);
    
    let elems = document.getElementsByClassName('c') as any;
    let triggers = [] as Trigger[];
    for (let elem of elems) {
	let caption = new Caption(elem);
	let t = splitParams(elem.getAttribute('t'));
	if (t) {
	    caption.t0 = t[0];
	    caption.t1 = t[1];
	    triggers.push(new Trigger(caption.t0, true, caption));
	    triggers.push(new Trigger(caption.t1, false, caption));
	}
	let p = splitParams(elem.getAttribute('p'));
	if (p) {
	    caption.x = p[0];
	    caption.y = p[1];
	}
	caption.anchor = elem.getAttribute('n');
	caption.tweenIn = elem.getAttribute('tin');
	caption.tweenOut = elem.getAttribute('tout');
    }
    triggers.sort((a,b) => { return a.t - b.t; });
    
    let segments = [] as Segment[];
    let captions = [] as Caption[];
    segments.push(new Segment(-Infinity, []));
    for (let trig of triggers) {
	if (trig.show) {
	    captions.push(trig.caption);
	} else {
	    let i = captions.indexOf(trig.caption);
	    captions.splice(i, 1);
	}
	segments.push(new Segment(trig.t, captions.slice()));
    }
    segments.push(new Segment(+Infinity, []));
    screen.segments = segments;
    
    window.addEventListener('resize', () => { screen.resize(); });
    window.addEventListener('focus', () => { screen.focus(); });
    window.addEventListener('blur', () => { screen.blur(); });
    window.setInterval(() => { screen.update(); }, interval);
}

function run(id: string, delay=-1) {
    displayTime = document.getElementById('displayTime');
    let video = document.getElementById(id) as HTMLVideoElement;
    hookVideo(video);
    if (0 <= delay) {
	window.setTimeout(() => { video.play(); }, delay);
    }
}
