
var canvas;
var gl;

var maxNumVertices  = 3000000;
var cindex_shape = 1;
var cindex_background = 0;
var cindex_fill = 1;
var fill = 0;
var index = 0;
var total_count_koch = 0;

var vertices = [];
var initial_vertices = [];

var fColorLocation;
var colorBuffer;
var vBuffer;
var cBuffer;

var isDrawFinish = false;

window.onload = function init() {
    /*
        Get canvas from web browser
    */
    canvas = document.getElementById( "gl-canvas" );
    
    /*
        Check whether webgl is supported by browser 
    */
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    /*
        Set canvas size and color
    */
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor(0, 0, 0, 1.0);

    /* 
        Load shaders and initialize attribute buffers
    */
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    /*
        Create vertex buffer
    */
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumVertices, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    /*
        Create color buffer
    */
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    /*
        Set initial background color;
    */
    
    rgb = hexToRgb(document.getElementById("background").value);
    cindex_background = vec4(rgb.r, rgb.g, rgb.b, 1);

    /*
        Set initial shape color
    */
    rgb = hexToRgb(document.getElementById("shape").value);
    cindex_shape = vec4(rgb.r, rgb.g, rgb.b, 1);

    /*
        Add New Point to vBuffer and cBuffer
    */
    var firstMove = true; 
    var last_point; // last added point into the buffers

    canvas.addEventListener("mousedown", function(event){

        if (!isDrawFinish){
            // if it is first point that will be added buffer
            if (index == 0){
                // get mouse's position when it is down
                last_point = vec2(2*event.clientX/canvas.width-1, 
                    2*(canvas.height-event.clientY)/canvas.height-1);

                // add points to vertices array
                vertices.push(last_point[0]);
                vertices.push(last_point[1]);
                
                // add these points to vBuffer and cBuffer too
                addPoint(last_point, vBuffer, cBuffer);

                index++;
            }
            // if there is already a point in the buffer 
            else {
                // get mouse's position when it is down
                last_point = vec2(2*event.clientX/canvas.width-1, 
                    2*(canvas.height-event.clientY)/canvas.height-1);

                // add pints to cBuffer and vBuffer
                addPoint(last_point, vBuffer, cBuffer);
                
                index++;
            }
        }
    });

    canvas.addEventListener("mousemove", function(event){
        if(!isDrawFinish){

            // when you move mouse increase index by one because new point will be added to buffer, so that line follows cursor.
            if (firstMove){
                index++;
                firstMove = false;
            }

            // set last point cursor point while cursor is moving
            last_point = vec2(2*event.clientX/canvas.width-1, 
                2*(canvas.height-event.clientY)/canvas.height-1);

            // decrase index, add last point, increase index; so that line can follow cursor while it is moving
            index--; 
            addPoint(last_point, vBuffer, cBuffer);
            index++; 
        }
    } );

    
    canvas.addEventListener("mouseup", function(event){

        if (!isDrawFinish){

            if (!firstMove ){
                firstMove == true;
            }

            // calculate distance between first ponint and the last point
            var distance = Math.sqrt(Math.pow(last_point[0]-vertices[0], 2) + Math.pow(last_point[1]-vertices[1],2));
            
            // if distance is smaller than 0.1 drawing will be finished
            if (distance < 0.1){
                isDrawFinish = true;
                index -= 2;
            } // if distance is larger than 0.1 drawing will continue and last points will be added to vertices array
            else{
                vertices.push(last_point[0]);
                vertices.push(last_point[1]);
            }
        }

        // after drawing is finish, initialize initial vertices so that it can be saved.
        initial_vertices = vertices;
    });  
    
    /*
        Clear canvas
    */
    var clear_button = document.getElementById("clear_button")
    clear_button.addEventListener("click", function () {
        index = 0;
        vertices = [];
        isDrawFinish = false;
        firstMove = true;
        total_count_koch = 0;
        initial_vertices = [];
        renewBuffers();
    });


    /*
        Koch Curve Implementation
    */
    var no_iter;
    var submit_button = document.getElementById("submit_btn");
    submit_button.addEventListener("click", function () {

        // get number of iteration
        no_iter = document.getElementById("iter").value;
        
        if (no_iter != undefined && no_iter >= 0 && isDrawFinish){
            
            total_count_koch = no_iter;
            
            if (no_iter == 0){
                vertices = initial_vertices;
                renewBuffers();
            } 
            else {
                vertices = initial_vertices;

                vertices.push(vertices[0], vertices[1]);
                
                for (var i = 0; i < no_iter; i++){
                    /* Koch Curve Implementation Here */
                    vertices = applyKochCurves(vertices);
                }
                
                renewBuffers();
            }
        }

    });

    /* Save Button */
    var save_button = document.getElementById('save_button');
    save_button.addEventListener("click", function() {


        var data = [];

        // initial_vertices
        data[0] = initial_vertices;

        // total_count
        data [1] = total_count_koch;

        // vec4 for shape cindex_shape
        data[2] = cindex_shape;

        // vec4 for background cindex_background
        data[3] = cindex_background
        
        var write_element = document.createElement('a');
        write_element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data)));
        write_element.setAttribute('download', "myAnimation.txt");

        write_element.style.display = 'none';
        document.body.appendChild(write_element);
        write_element.click();
        document.body.removeChild(write_element);

    });
    
    /* Load Button */
    var load_button = document.getElementById('load_button');
    load_button.addEventListener("click", function() {

        // check the FILE API support
        if (window.File && window.FileReader && window.FileList && window.Blob) {

            load_button.addEventListener('change', function() {
                let myFile = load_button.files[0];
                let fileReader = new FileReader();
                fileReader.onload = function() {

                    let result = JSON.parse(fileReader.result);

                    initial_vertices = result[0];
                    total_count_koch = result[1];
                    cindex_shape = result[2];
                    cindex_background = result[3];

                    vertices = initial_vertices;

                    for (var i = 0; i < total_count_koch; i++){
                        vertices = applyKochCurves(vertices);
                    }

                    renewBuffers();

                    t = cindex_background;
                    gl.clearColor(flatten(t)[0], flatten(t)[1], flatten(t)[2], flatten(t)[3]);
                    isDrawFinish = true;
                };

                fileReader.readAsText(myFile);
            });

        } else {
            alert("File System is not supported in this browser");
        }

    });

    /*
        Change Background Color
    */
    var background_color = document.getElementById("background");
    background_color.addEventListener("input", function() {
        rgb = hexToRgb(background_color.value);
        cindex_background = vec4(rgb.r, rgb.g, rgb.b, 1);
        t = cindex_background;
        gl.clearColor(flatten(t)[0], flatten(t)[1], flatten(t)[2], flatten(t)[3]);
    });

    /*
        Change shape color when the selected color is changed
    */
    var shape_color = document.getElementById("shape");
    shape_color.addEventListener("input", function() {
        var rgb = hexToRgb(shape_color.value);
        cindex_shape = vec4(rgb.r, rgb.g, rgb.b,1);
    });
    render();
}

/*
    HEX color values can be converted to rgb colors with this function
*/
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

/* 
    Curve Drawer
*/
function applyKochCurves(data){

    var new_vertices = [];
    var point1;
    var point2;
    for (var i = 0; i < data.length-3; i+=2){
        point1 = [data[i],data[i+1]];
        point2 = [data[i+2], data[i+3]];

        var xDirection = 1;
        var yDirection = 1;

        var flagx = point2[0] - point1[0];
        var flagy = point2[1] - point1[1];

        if (flagy == 0)
        {
            xDirection = 1;
            yDirection = 1;
        }
        else {
            xDirection = -1;
            yDirection = 1;
        } 
        
        var xDistance = (point2[0] - point1[0])/4.0;
        var yDistance = (point2[1] - point1[1])/4.0;

        new_vertices.push(point1[0], point1[1]);
        new_vertices.push(point1[0] + xDistance, point1[1] + yDistance);
        new_vertices.push(point1[0] +  xDistance + xDirection * yDistance, point1[1] + yDistance + yDirection * xDistance);

        new_vertices.push((point1[0] + point2[0])/2 + xDirection * yDistance, (point1[1] + point2[1])/2 + yDirection * xDistance);
        new_vertices.push(point1[0]+ 2*xDistance, point1[1]+2*yDistance);
        new_vertices.push((point1[0] + point2[0])/2 - xDirection * yDistance, (point1[1] + point2[1])/2 - yDirection * xDistance );

        new_vertices.push(point2[0] - xDistance - xDirection * yDistance, point2[1] -  yDistance -  yDirection * xDistance); 
        new_vertices.push(point2[0] - xDistance, point2[1] - yDistance);
        

    }
    new_vertices.push(point2[0], point2[1]);
    
    index = new_vertices.length / 2;
    return new_vertices;
}

/*
    After updating vertices array, buffers can be updated with this function
*/
function renewBuffers(){

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    index = 0; 
    for (var i = 0; i < vertices.length; i+=2){
        var k = vec2(vertices[i], vertices[i+1])
        gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(k));
        index++;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    t = cindex_shape;
    var temp = index;
    for (temp; temp > 0; temp--) {
        gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (temp - 1), flatten(t));
    }
}

/*
    in order to add new point to the buffer
*/
function addPoint(last_point, vBuffer, cBuffer) {
    // body...
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index), flatten(last_point));

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    var t = cindex_shape;
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index), flatten(t));
}

/*
    In order to change color of shape or filling color
*/
function changeColor(cBuffer, color_vector) {
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    t = color_vector;
    var temp = index;
    for (temp; temp > 0; temp--) {
        gl.bufferSubData(gl.ARRAY_BUFFER, 16 * (temp - 1), flatten(t));
    }
}

/*
    Render Function
*/
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (fill = document.getElementById("fill").checked) 
    {
        var rgb = hexToRgb(document.getElementById("inside").value);
        cindex_fill = vec4(rgb.r, rgb.g, rgb.b,1);
        changeColor(cBuffer, cindex_fill);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, index);
    }
    if (!isDrawFinish)
    {
        changeColor(cBuffer, cindex_shape);
        gl.drawArrays( gl.LINE_STRIP, 0, index );
    }
    else
    {
        changeColor(cBuffer, cindex_shape);
        gl.drawArrays( gl.LINE_LOOP, 0, index );
    }
    window.requestAnimFrame(render);
}
