var canvas;
var gl;
var vertices = [];
var vertBuffer,baitBuffer,tailBuffer,colorBuffer;
var vertShader,baitVertShader,tailVertShader;
var fragShader,baitFragShader,tailFragShader;
var shaderProgram,baitShaderProgram,tailShaderProgram;
var snakeHead = [-5,7.5, 5,7.5, 5,-7.5, -5,-7.5];
//var snakeHead = [0,0, 10,15, 20,0];
var baitDefault = [0,0, 0,10, 10,10, 10,0];
var clipSpaceTransform;
var x=1,y=1;
var moveMat;
var speed = 3.0;
var direction = 0,movement=0;
var baitPos = [];
var tailLength = 0;
var tail = [];  
var score = 0;
var scoreField;
var animFrame;
var debug = [];

var green = [0.0,0.3,0.0];
var white = [1.0,0.0,0.0];
var pattern = 0;
var tailColors = [green,white];
var tailPattern = [];
var tailIndices=[];

function init()
{
	canvas=document.getElementById("playArea");
	scoreField=document.getElementById("score");
	document.addEventListener("keydown",function (event)
	
	{

	 switch(event.key)
		{
		  case "ArrowUp":
			movement = 0;
		  break;
		  case "ArrowRight":
			movement = 1;
		  break;
		  case "ArrowDown":
			movement = 2;
		  break;
		  case "ArrowLeft":
			movement = 3;
		  break;
		}
	}
	,true);

	gl = canvas.getContext("experimental-webgl");
	gl.clearColor(1.0,1.0,1.0,1);
	// initBackground();
	gl.clear(gl.COLOR_BUFFER_BIT);
	initVertShader();
	initFragShader();
	shaderProgram = createShaderProgram(vertShader,fragShader);
	initBaitVertShader();
	initBaitFragShader();
	baitShaderProgram = createShaderProgram(baitVertShader,baitFragShader);
	initTailVertShader();
	initTailFragShader();
	tailShaderProgram = createShaderProgram(tailVertShader,tailFragShader);

	loadTexture();

    x = canvas.width/2;
    y = canvas.height/2;
    clipSpaceTransform = [ 1/x, 0.0, 0.0, 0.0,
			  0.0, 1/y , 0.0, 0.0,
			  0.0, 0.0, 1.0, 0.0,
	        	 0.0, 0.0, 0.0, 1.0];
	moveMat = [1,0,0,0,
		   0,1,0,0,
		   0,0,1,0,
		   0,0,0,1];
	setBait();
	initTail();	      
	drawSnakeHead();
}

function resetMovement()
{
		moveMat = [1,0,0,0,
		   0,1,0,0,
		   0,0,1,0,
		   0,0,0,1];

}

function initVertShader()
{
	var vertCode = 
	"attribute vec2 coordinates;"+
	"uniform mat4 u_scale;"+
    "uniform mat4 u_transformation;"+
	"void main(void){  mat4 transformedMat = u_transformation*u_scale; "+ 
    "gl_Position = vec4(vec4(coordinates,0.0,1)*transformedMat);"+
	"}";
	vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader,vertCode);
	gl.compileShader(vertShader);
	console.log(gl.getShaderInfoLog(vertShader));
}

function initBaitVertShader()
{
	var vertCode = 
	"attribute vec2 coordinates;"+
	"uniform mat4 u_scale;"+
   	"void main(void){ gl_Position = vec4(vec4(coordinates,0.0,1)*u_scale);"+
	"}";
	baitVertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(baitVertShader,vertCode);
	gl.compileShader(baitVertShader);


}

function initTailVertShader()
{
	var vertCode = 
	"attribute vec2 coordinates;"+
	"attribute vec3 color;"+
	"varying vec3 v_color;"+
	"uniform mat4 u_scale;"+
   	"void main(void){ gl_Position = vec4(vec4(coordinates,0.0,1)*u_scale);"+
	"v_color = color;}";
	tailVertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(tailVertShader,vertCode);
	gl.compileShader(tailVertShader);

	console.log(gl.getShaderInfoLog(tailVertShader));
}

function initFragShader()
{
	var fragCode = 
	"void main(void){ gl_FragColor = vec4(0.0,0.0,0.0,1.0);}";
	fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader,fragCode);
	gl.compileShader(fragShader);

}

function initBaitFragShader()
{
	var fragCode = 
	"void main(void){ gl_FragColor = vec4(1.0,0.0,0.0,1.0);}";
	baitFragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(baitFragShader,fragCode);
	gl.compileShader(baitFragShader);

}

function initTailFragShader()
{
	var fragCode = 
	"precision mediump float;"+
	"varying vec3 v_color;"+
	"void main(void){"+ 
	" gl_FragColor = vec4(v_color,1.0);}";
	tailFragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(tailFragShader,fragCode);
	gl.compileShader(tailFragShader);
	console.log(gl.getShaderInfoLog(tailFragShader));

}

function createShaderProgram(vertexShader,fragmentShader)
{
	if(vertexShader==null || fragmentShader==null)
	{
		console.log("Error: Empty Shader");
		return;
	}
	
	var program = gl.createProgram();	
	gl.attachShader(program,vertexShader);
	gl.attachShader(program,fragmentShader);
	gl.linkProgram(program);
	console.log(gl.getShaderInfoLog(vertexShader));
	return program;
}

function setViewPort(startx,starty,width,height)
{
	gl.viewport(startx,starty,width,height);
}

function translate(trans_x,trans_y)
{
	moveMat[3]+=trans_x;
    moveMat[7]+=trans_y;
}

function rotate(theta)
{
	var a = moveMat[0];
	var b = moveMat[1];
	var e = moveMat[4];
	var f = moveMat[5];
	
	moveMat[0] = a*Math.cos(theta)+b*Math.sin(theta);
	moveMat[1] = b*Math.cos(theta)-a*Math.sin(theta);

	moveMat[4] = e*Math.cos(theta)+f*Math.sin(theta);	
	moveMat[5] = f*Math.cos(theta)-e*Math.sin(theta);

}

function initTail()
{
	tail[0]=snakeHead[6];
	tail[1]=snakeHead[7];

	tail[2]=snakeHead[4];
	tail[3]=snakeHead[5];	

	tailIndices[0]=0;
	tailIndices[1]=1;
	
	tailPattern = tailPattern.concat(tailColors[pattern]);
	pattern = Number(!pattern);
	tailPattern = tailPattern.concat(tailColors[pattern]);

	// Temp 

	for(var i =0 ;i<10;i++)
	{
		var t = tailLength+1;
		tail[t*4] = tail[(t-1)*4];
		tail[t*4+1] = tail[(t-1)*4+1];

		tailPattern = tailPattern.concat(tailColors[pattern]);
		pattern = Number(!pattern);
		tailPattern = tailPattern.concat(tailColors[pattern]);
		

		tail[t*4+2] = tail[(t-1)*4+2];
		tail[t*4+3] = tail[(t-1)*4+3];		

		tailPattern = tailPattern.concat(tailColors[pattern]);
		pattern = Number(!pattern);
		tailPattern = tailPattern.concat(tailColors[pattern]);

		tailLength++;
		addIndicies();

	}

	console.log(tailPattern);


}

function initBackground()
{
	backTex = gl.createTexture();
	backTex.Img = new Image();
	backTex.Img.onload = function(){
		handleBkTex(backTex);}
	backTex.Img.src = "ground1.jpeg";
}

function handleBkTex(tex) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.Img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function loadTexture()
{
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D,texture);
	  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1,1,0,gl.RGBA, gl.UNSIGNED_BYTE,new Uint8Array([0,0,255,255]));

	const image = new Image();
	image.src = "snakeTex.png";
	image.onload = function(){
		   gl.bindTexture(gl.TEXTURE_2D, texture);
		   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
		   if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
       } else {
       // No, it's not a power of 2. Turn of mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  

  return texture;
 

}

function isPowerOf2(value) 
{
  return (value & (value - 1)) == 0;
}

function resetSnakeHead()
{
	snakeHead = [0,0, 10,0.0, 10,-15, 0,-15];
}

function drawSnakeHead()
{
	var headXmin,headXmax,headYmin,headYmax;
	var temp;
	headXmin = moveMat[0]*snakeHead[0] + moveMat[1]*snakeHead[1] + moveMat[3];
	headXmax = moveMat[0]*snakeHead[4] + moveMat[1]*snakeHead[5] + moveMat[3];
	headYmin = moveMat[4]*snakeHead[4] + moveMat[5]*snakeHead[5] + moveMat[7];
	headYmax = moveMat[4]*snakeHead[0] + moveMat[5]*snakeHead[1] + moveMat[7];

//	var baitMidX = baitPos[0]+3;
//	var baitMidY = baitPos[1]+3;
	
	 	
	
	if(headXmin > headXmax)
	{
		temp = headXmin;
		headXmin = headXmax;
		headXmax = temp;		
	}

	if(headYmin > headYmax)
	{
		temp = headYmin;
		headYmin = headYmax;
		headYmax = temp;
	}
					
      gl.useProgram(shaderProgram);
      vertBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,vertBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(snakeHead),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,null);
              
      gl.bindBuffer(gl.ARRAY_BUFFER,vertBuffer);
      var coord = gl.getAttribLocation(shaderProgram,"coordinates");
      gl.vertexAttribPointer(coord,2,gl.FLOAT,false,0,0);
      var offsetLoc = gl.getUniformLocation(shaderProgram,"u_scale");
      gl.uniformMatrix4fv(offsetLoc,false,clipSpaceTransform);

      gl.enableVertexAttribArray(coord);
      gl.enable(gl.DEPTH_TEST);
  //    gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLE_FAN,0,4);

	var turn = Math.PI / 2;
	if (direction/2 >= 1)
	{turn=turn*-1;}
	switch(movement)
	{
	  case 0:
		if((direction+movement)%2==0 && direction != movement)
			{
				movement=direction;
				break;
			}
			
		if(direction != movement)
			{  rotate(turn);
			   translate((-1+2*Math.floor(direction/2))*2.5,2.5)
                           direction = movement;
			}
		else
			{translate(0,speed);	}
	  break;
	  case 1:
		if((direction+movement)%2==0 && direction != movement)
			{
				movement=direction;
				break;
			}
		if(direction != movement)
			{ rotate(-1*turn);
			translate(2.5,(-1+2*Math.floor(direction/2))*2.5);
		   	direction = movement;
			}
		else
			{translate(speed,0);}
		
	  break;
	  case 2:
		if((direction+movement)%2==0 && direction != movement)
			{
				movement=direction;
				break;
			}
		if(direction != movement)
			{  	rotate(-1*turn);
				translate((-1+2*Math.floor(direction/2))*2.5,-1*2.5)
				direction = movement;
			}
		else
			{translate(0,-1*speed);}
	  break;
	  case 3:
		if((direction+movement)%2==0 && direction != movement)
			{
				movement=direction;
				break;
			}
		if(direction != movement)
			{ 	rotate(turn);
				translate(-1*2.5,(-1+2*Math.floor(direction/2))*2.5)
				direction = movement;
			}
		else
			{translate(-1*speed,0);}
	  break;
	}
	
		
   var transformLoc = gl.getUniformLocation(shaderProgram,"u_transformation");
   gl.uniformMatrix4fv(transformLoc,false,moveMat);

  animFrame = requestAnimationFrame(drawSnakeHead);
   drawTail();	
   drawBait();
   checkCollision();
	
	if(reachedBait(headXmin,headYmin,headXmax,headYmax))
	{eat();}
 

}

function drawBait()
{
      gl.useProgram(baitShaderProgram);
      vertBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,vertBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(baitPos),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,null);
              
      gl.bindBuffer(gl.ARRAY_BUFFER,vertBuffer);
      var coord = gl.getAttribLocation(baitShaderProgram,"coordinates");
      gl.vertexAttribPointer(coord,2,gl.FLOAT,false,0,0);
      var offsetLoc = gl.getUniformLocation(baitShaderProgram,"u_scale");
      gl.uniformMatrix4fv(offsetLoc,false,clipSpaceTransform);

      gl.enableVertexAttribArray(coord);

      gl.drawArrays(gl.TRIANGLE_FAN,0,4);

}

function drawTail()
{
	for(var i=tailLength+1;i>0;i--)
	{
		tail[i*4]=tail[(i-1)*4];
		tail[i*4+1]=tail[(i-1)*4+1];

		tail[i*4+2]=tail[(i-1)*4+2];
		tail[i*4+3]=tail[(i-1)*4+3];

					
	}

	tail[0]= moveMat[0]*snakeHead[6] + moveMat[1]*snakeHead[7] + moveMat[3];
	tail[1]= moveMat[4]*snakeHead[6] + moveMat[5]*snakeHead[7] + moveMat[7];
	tail[2]= moveMat[0]*snakeHead[4] + moveMat[1]*snakeHead[5] + moveMat[3];
	tail[3]= moveMat[4]*snakeHead[4] + moveMat[5]*snakeHead[5] + moveMat[7];


      gl.useProgram(tailShaderProgram);
      tailBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,tailBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(tail),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,null);

      tailIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tailIndexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tailIndices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

       
      gl.bindBuffer(gl.ARRAY_BUFFER,tailBuffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tailIndexBuffer);

      var coord = gl.getAttribLocation(tailShaderProgram,"coordinates");
      gl.vertexAttribPointer(coord,2,gl.FLOAT,false,0,0);
      gl.enableVertexAttribArray(coord);

      var offsetLoc = gl.getUniformLocation(tailShaderProgram,"u_scale");
      gl.uniformMatrix4fv(offsetLoc,false,clipSpaceTransform);


      colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(tailPattern),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);	

      gl.bindBuffer(gl.ARRAY_BUFFER,colorBuffer);
    

      var color = gl.getAttribLocation(tailShaderProgram,"color");
      gl.vertexAttribPointer(color,3,gl.FLOAT,false,0,0);
      gl.enableVertexAttribArray(color);			
	
   
//      gl.drawArrays(gl.LINE_STRIP,0,(tailLength+1)*2);
      gl.drawElements(gl.TRIANGLE_STRIP,tailIndices.length,gl.UNSIGNED_SHORT,tailIndexBuffer);

}

function setBait()
{
	var baitX = Math.random()*(2*(x-20))-(x-20);
	var baitY =  Math.random()*(2*(y-20))-(y-20);

	baitPos[0] = baitX+baitDefault[0];
	baitPos[2] = baitX+baitDefault[2];
	baitPos[4] = baitX+baitDefault[4];
	baitPos[6] = baitX+baitDefault[6];


	baitPos[1] = baitY+baitDefault[1];
	baitPos[3] = baitY+baitDefault[3];
	baitPos[5] = baitY+baitDefault[5];
	baitPos[7] = baitY+baitDefault[7];

}

function reachedBait(xmin,ymin,xmax,ymax)
{
	var i=0;

	if((baitPos[6]>xmin && baitPos[6]<xmax ) || (baitPos[2]>xmin && baitPos[2]<xmax ))
		i++;

	if((baitPos[7]>ymin && baitPos[7]<ymax ) || (baitPos[3]>ymin && baitPos[3]<ymax ))
		i++;
	
	if(i==2)
	return true;
	else
	return false;

}

function eat()
{

	tail[(tailLength)*4] = tail[(tailLength-1)*4];
	tail[(tailLength)*4+1] = tail[(tailLength-1)*4+1];
	

	tailPattern = tailPattern.concat(tailColors[pattern]);
	pattern = Number(!pattern);
	tailPattern = tailPattern.concat(tailColors[pattern]);

	tail[(tailLength)*4+2] = tail[(tailLength-1)*4+2];
	tail[(tailLength)*4+3] = tail[(tailLength-1)*4+3];


	tailPattern = tailPattern.concat(tailColors[pattern]);
	pattern = Number(!pattern);
	tailPattern = tailPattern.concat(tailColors[pattern]);
	
	addIndicies()

	
	tailLength++;
	speed+=01;
	score+=1;
	document.getElementById("score").value=score;
	setBait();	

}

function gameOver()
{
	cancelAnimationFrame(animFrame);
	speed=0;
}

function checkCollision()
{
	if(moveMat[7]>y || moveMat[7]<-1*y || moveMat[3]>x || moveMat[3]<-1*x)
	{
		gameOver();
	}
	//alert(tail);
	var xMid = (snakeHead[0]+snakeHead[2])/2;
	var yMid = (snakeHead[1]+snakeHead[3])/2;

	var nextX =round( moveMat[0]*xMid + moveMat[1]*yMid + moveMat[3]);
	var nextY =round( moveMat[4]*xMid + moveMat[5]*yMid + moveMat[7]);
	var i = 0;
	debug=[];
	while(i<(tailLength-1)*4)
	{
			
	 if( round(tail[i]) == round(tail[i+2]))
	  {
		var start = i;
		while((round(tail[i]) == round(tail[i+2])) && i<(tailLength-1)*4)
		{i+=4;}
		
		var xmin = Math.min(round(tail[start]),round(tail[i-2]));
		var xmax = Math.max(round(tail[start]),round(tail[i-2]));
		var ymin = Math.min(round(tail[start+1]),round(tail[i-1]));
		var ymax = Math.max(round(tail[start+1]),round(tail[i-1]));

		if((xmin<nextX && xmax>nextX) && (ymin<nextY && ymax>nextY))
		  {
			gameOver();
		  }

		
	  }
	 else if(round(tail[i+1]) == round(tail[i+3]))
	  {
		var start = i;
		while((round(tail[i+1]) == round(tail[i+3])) && i<(tailLength-1)*4)
		{i+=4;}


		var xmin = Math.min(round(tail[start]),round(tail[i-2]));
		var xmax = Math.max(round(tail[start]),round(tail[i-2]));
		var ymin = Math.min(round(tail[start+1]),round(tail[i-1]));
		var ymax = Math.max(round(tail[start+1]),round(tail[i-1]));

		if((xmin<nextX && xmax>nextX) && (ymin<nextY && ymax>nextY))
		 { gameOver();}
	  }
	else
	{
		i+=4;
	}
	
	}
	

}

function round(num)
{
	return Math.round(num*100)/100;
}

function addIndicies()
{
	
	if((tailIndices[tailIndices.length-1]+1)%4 == 0)
	{
		tailIndices[tailIndices.length] = tailIndices[tailIndices.length-1]+1;
		tailIndices[tailIndices.length] = tailIndices[tailIndices.length-1]+1;
	}
	else
	{
		tailIndices[tailIndices.length] = tailIndices[tailIndices.length-1]+2;
		tailIndices[tailIndices.length] = tailIndices[tailIndices.length-1]-3;
		tailIndices[tailIndices.length] = tailIndices[tailIndices.length-1]+2;
		tailIndices[tailIndices.length] = tailIndices[tailIndices.length-1]+1;	
	}

}