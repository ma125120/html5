
var css = function(el,attr,value) {
	if(value) {
		el.style[attr] = value;
	} else {
		return window.getComputedStyle(el,null)[attr];
	}
}

function drag(el,event) {
	var x = 0, y = 0,
			move = false,
			can = false;
	el.addEventListener("click",function(e) {
		[x,y] = [e.clientX, e.clientY];
		can = true;
	},false);
	el.addEventListener("mousedown",function(e) {
		[x,y] = [e.clientX, e.clientY];
		move = true;
		return false;
	},false);
	el.addEventListener("mousemove",throttle(function(e) {
		if(move&&can) {
					var left = css(el,"left"),
							top = css(el,"top");console.log(top)
					el.style.left = parseInt(left) + e.clientX - x + "px";
					el.style.top = parseInt(top) + e.clientY - y + "px";
					[x,y] = [e.clientX, e.clientY];
		}
	}),false);
	el.addEventListener("mouseout",function(e) {
		move = false;
		return false;
	},false);
	el.addEventListener("mouseup",function(e) {
		move = false;

		return false;
	},false);
}

drag(document.getElementById("dragme"));


function throttle(fn,delay = 0) {
	return function(...args) {
		clearTimeout(fn.tid);
		fn.tid = setTimeout(()=>{
			fn.apply(this,args);
		}, delay);
	}
}