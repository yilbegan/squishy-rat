// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (/* function */ callback, /* DOMElement */ element) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

class Particle {
  constructor(x, y) {
    this.x = x + Math.random() * 10;
    this.y = y + Math.random() * 10;
    this.xv = Math.random() < 0.5 ? Math.random() : -Math.random();
    this.yv = Math.random() < 0.5 ? Math.random() : -Math.random();
    this.opacity = Math.random() * 10;
    this.decay = 0.1;
    this.size = 10 + Math.random() * 2;
  }

  update() {
    this.x += this.xv
    this.y += this.yv
    this.opacity -= this.decay
    return this.opacity > 0
  }

  draw(ctx) {
    let x = this.x + this.size / 2;
    let y = this.y + this.size / 2;
    let width = this.size;
    let height = this.size;

    ctx.save();
    ctx.beginPath();
    let topCurveHeight = height * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(
      x, y,
      x - width / 2, y,
      x - width / 2, y + topCurveHeight
    );

    ctx.bezierCurveTo(
      x - width / 2, y + (height + topCurveHeight) / 2,
      x, y + (height + topCurveHeight) / 2,
      x, y + height
    );

    ctx.bezierCurveTo(
      x, y + (height + topCurveHeight) / 2,
      x + width / 2, y + (height + topCurveHeight) / 2,
      x + width / 2, y + topCurveHeight
    );

    ctx.bezierCurveTo(
      x + width / 2, y,
      x, y,
      x, y + topCurveHeight
    );

    ctx.closePath();
    ctx.fillStyle = `rgba(255, 0, 0, ${this.opacity})`;
    ctx.fill();
    ctx.restore();
  }
}

// This demo is based on: http://www.ewjordan.com/processing/VolumeBlob/

function init() {
  var width = window.innerWidth;
  var height = window.innerHeight;
  canvas.getContext("2d").canvas.width = width;
  canvas.getContext("2d").canvas.height = height;
  background.getContext("2d").canvas.width = width;
  background.getContext("2d").canvas.height = height;
  var EPS = 0.0001;
  var x = [];
  var y = [];
  var xLast = [];
  var yLast = [];
  var ax = [];
  var ay = [];
  var nParts = 40;
  var tStep = 1.0 / 60.0;
  var perimIters = 5; //number of perimiter fixing iterations to do - more means closer to perfect solidity
  var relaxFactor = 0.9; //1.0 would mean perfect solidity (no blobbiness) if it worked (unstable)
  var gravityForce = -9.8;
  var rad = 10.0;
  var blobAreaTarget;
  var sideLength;
  var mouseRad = 5.0;
  var rotateAccel = 10.0;
  var mousePos = [width / 20, height / 20];
  var particles = []

  var earth = new Image();
  var unloaded = 1;
  earth.onload = function () {
    --unloaded;
  };
  earth.src = 'img/rat.png';

  var moon = new Image();
  ++unloaded;
  moon.onload = function () {
    --unloaded;
  };
  moon.src = 'img/you.png';

  var heart = new Image();
  heart.src = 'img/heart.png'

  var hammer = new Hammer(document.getElementById("canvas"), {prevent_default: true});
  addEvent("mousemove", document.getElementById('canvas'), onMove);

  renderBackground();
  setupParticles();
  requestAnimFrame(update);

  function addEvent(evnt, elem, func) {
    if (elem.addEventListener)  // W3C DOM
      elem.addEventListener(evnt, func, false);
    else if (elem.attachEvent) { // IE DOM
      elem.attachEvent("on" + evnt, func);
    } else {
      elem[evnt] = func;
    }
  }

  function renderBackground() {
    var ctx = background.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    //
    // var area = width * height;
    // for (var i = 0; i < area / 10000; ++i) {
    //   ctx.beginPath();
    //   ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2, true);
    //   ctx.fillStyle = "white";
    //   ctx.fill();
    // }
    // for (var i = 0; i < area / 1000; ++i) {
    //   ctx.beginPath();
    //   ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 0.5, 0, Math.PI * 2, true);
    //   ctx.fillStyle = "white";
    //   ctx.fill();
    // }
  }

  hammer.ondrag = function (e) {
    var p = mapInv([Math.round(e.position.x), Math.round(e.position.y)]);
    if (!isPointInBlob(p)) {
      mousePos = p;
    }
  };

  function setupParticles() {
    x = new Array(nParts);
    y = new Array(nParts);
    xLast = new Array(nParts);
    yLast = new Array(nParts);
    ax = new Array(nParts);
    ay = new Array(nParts);

    var cx = width / 20;
    var cy = height / 20;
    for (var i = 0; i < nParts; ++i) {
      var ang = i * 2 * Math.PI / nParts;
      x[i] = cx + Math.sin(ang) * rad;
      y[i] = cy + Math.cos(ang) * rad;
      xLast[i] = x[i];
      yLast[i] = y[i];
      ax[i] = 0;
      ay[i] = 0;
    }

    sideLength = Math.sqrt((x[1] - x[0]) * (x[1] - x[0]) + (y[1] - y[0]) * (y[1] - y[0]));

    blobAreaTarget = getArea();
    fixPerimeter();
  }

  function getArea() {
    var area = 0.0;
    area += x[nParts - 1] * y[0] - x[0] * y[nParts - 1];
    for (var i = 0; i < nParts - 1; ++i) {
      area += x[i] * y[i + 1] - x[i + 1] * y[i];
    }
    area *= 0.5;
    return area;
  }

  function integrateParticles(dt) {
    var dtSquared = dt * dt;
    var gravityAddY = -gravityForce * dtSquared;
    for (var i = 0; i < nParts; ++i) {
      var bufferX = x[i];
      var bufferY = y[i];
      x[i] = 2 * x[i] - xLast[i] + ax[i] * dtSquared;
      y[i] = 2 * y[i] - yLast[i] + ay[i] * dtSquared + gravityAddY;
      xLast[i] = bufferX;
      yLast[i] = bufferY;
      ax[i] = 0;
      ay[i] = 0;
    }
  }

  function collideWithEdge() {
    for (var i = 0; i < nParts; ++i) {
      if (x[i] < 0) {
        x[i] = 0;
        yLast[i] = y[i];
      } else if (x[i] > width / 10) {
        x[i] = width / 10;
        yLast[i] = y[i];
      }
      if (y[i] < 0) {
        y[i] = 0;
        xLast[i] = x[i];
      } else if (y[i] > height / 10) {
        y[i] = height / 10;
        xLast[i] = x[i];
      }
    }
  }

  function fixPerimeter() {
    // Fix up side lengths
    var diffx = new Array(nParts);
    var diffy = new Array(nParts);
    for (var i = 0; i < nParts; ++i) {
      diffx[i] = 0;
      diffy[i] = 0;
    }

    for (var j = 0; j < perimIters; ++j) {
      for (var i = 0; i < nParts; ++i) {
        var next = (i == nParts - 1) ? 0 : i + 1;
        var dx = x[next] - x[i];
        var dy = y[next] - y[i];
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < EPS) distance = 1.0;
        var diffRatio = 1.0 - sideLength / distance;
        diffx[i] += 0.5 * relaxFactor * dx * diffRatio;
        diffy[i] += 0.5 * relaxFactor * dy * diffRatio;
        diffx[next] -= 0.5 * relaxFactor * dx * diffRatio;
        diffy[next] -= 0.5 * relaxFactor * dy * diffRatio;
      }

      for (var i = 0; i < nParts; ++i) {
        x[i] += diffx[i];
        y[i] += diffy[i];
        diffx[i] = 0;
        diffy[i] = 0;
      }
    }
  }

  function constrainBlobEdges() {
    fixPerimeter();
    var perimeter = 0.0;
    var nx = new Array(nParts); //normals
    var ny = new Array(nParts);
    for (var i = 0; i < nParts; ++i) {
      var next = (i == nParts - 1) ? 0 : i + 1;
      var dx = x[next] - x[i];
      var dy = y[next] - y[i];
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < EPS) distance = 1.0;
      nx[i] = dy / distance;
      ny[i] = -dx / distance;
      perimeter += distance;
    }

    var deltaArea = blobAreaTarget - getArea();
    var toExtrude = 0.5 * deltaArea / perimeter;

    for (var i = 0; i < nParts; ++i) {
      var next = (i == nParts - 1) ? 0 : i + 1;
      x[next] += toExtrude * (nx[i] + nx[next]);
      y[next] += toExtrude * (ny[i] + ny[next]);
    }
  }

  function collideWithMouse() {
    if (isPointInBlob(mousePos)) {
      mousePos[1] = 1000;
    }
    var mx = mousePos[0];
    var my = mousePos[1];
    for (var i = 0; i < nParts; ++i) {
      var dx = mx - x[i];
      var dy = my - y[i];
      var distSqr = dx * dx + dy * dy;
      if (distSqr > mouseRad * mouseRad) continue;
      if (distSqr < EPS * EPS) continue;
      var distance = Math.sqrt(distSqr);
      x[i] -= dx * (mouseRad / distance - 1.0);
      y[i] -= dy * (mouseRad / distance - 1.0);
      if (Math.random() < 0.1) {
        particles.push(new Particle(x[i] * 10, y[i] * 10))
      }
    }
  }

  window.onresize = function (event) {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.getContext("2d").canvas.width = width;
    canvas.getContext("2d").canvas.height = height;
    background.getContext("2d").canvas.width = width;
    background.getContext("2d").canvas.height = height;
    renderBackground();
    setupParticles();
  }

  function update() {
    for (var i = 0; i < 3; ++i) {
      integrateParticles(tStep);
      constrainBlobEdges();
      collideWithEdge();
      collideWithMouse();
    }

    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);
    draw(ctx);
    drawMouse(ctx);
    particles = particles.reduce((p, c) => {
      if (c.update()) {
        p.push(c)
      }
      return p
    }, []);
    particles.map((c) => c.draw(ctx));

    requestAnimFrame(update);
  }

  function onMove(e) {
    var p = mapInv(getCursorPosition(e));
    if (!isPointInBlob(p)) {
      mousePos = p;
    }
  }

  function isPointInBlob(p) {
    for (var c = false, i = -1, l = nParts, j = l - 1; ++i < l; j = i)
      ((y[i] <= p[1] && p[1] < y[j]) || (y[j] <= p[1] && p[1] < y[i]))
      && (p[0] < (x[j] - x[i]) * (p[1] - y[i]) / (y[j] - y[i]) + x[i])
      && (c = !c);
    return c;
  }

  function getCursorPosition(e) {
    var x;
    var y;
    if (e.pageX || e.pageY) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    var canvas = document.getElementById('canvas');
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;
    return [x, y];
  }

  function drawMouse(ctx) {
    if (unloaded == 0) {
      var p = map(mousePos);
      ctx.drawImage(moon, p[0] - (mouseRad * 10), p[1] - (mouseRad * 10), mouseRad * 20, mouseRad * 20);
    }
  }

  function draw(ctx) {
    if (unloaded == 0) {
      var center_x = 0;
      var center_y = 0;
      for (var i = 0; i < nParts; ++i) {
        center_x += x[i];
        center_y += y[i];
      }
      center_x /= nParts;
      center_y /= nParts;
      var p1 = map([center_x, center_y]);

      var n = nParts / 2;
      for (var i = 0; i < n; ++i) {
        var j = i * nParts / n;
        var k = (i + 1) * nParts / n;
        if (k == nParts) k = 0;
        var p2 = map([x[j], y[j]]);
        var p3 = map([x[k], y[k]]);
        var a1 = 2 * Math.PI * (i / n);
        var a2 = 2 * Math.PI * ((i + 1) / n);
        var p4 = [earth.width / 2 + Math.sin(a1) * earth.width / 2, earth.height / 2 + Math.cos(a1) * earth.height / 2];
        var p5 = [earth.width / 2 + Math.sin(a2) * earth.width / 2, earth.height / 2 + Math.cos(a2) * earth.height / 2];
        textureMap(ctx, earth, [{x: p1[0], y: p1[1], u: earth.width / 2, v: earth.height / 2}, {
          x: p2[0],
          y: p2[1],
          u: p4[0],
          v: p4[1]
        }, {x: p3[0], y: p3[1], u: p5[0], v: p5[1]}]);
      }
    }
  }

  //http://stackoverflow.com/questions/4774172/image-manipulation-and-texture-mapping-using-html5-canvas
  function textureMap(ctx, texture, pts) {
    var x0 = pts[0].x, x1 = pts[1].x, x2 = pts[2].x;
    var y0 = pts[0].y, y1 = pts[1].y, y2 = pts[2].y;
    var u0 = pts[0].u, u1 = pts[1].u, u2 = pts[2].u;
    var v0 = pts[0].v, v1 = pts[1].v, v2 = pts[2].v;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 + (x1 - x0), y1 + (y1 - y0));
    ctx.lineTo(x2 + (x2 - x0), y2 + (y2 - y0));
    ctx.closePath();
    ctx.clip();
    var delta = u0 * v1 + v0 * u2 + u1 * v2 - v1 * u2 - v0 * u1 - u0 * v2;
    var delta_a = x0 * v1 + v0 * x2 + x1 * v2 - v1 * x2 - v0 * x1 - x0 * v2;
    var delta_b = u0 * x1 + x0 * u2 + u1 * x2 - x1 * u2 - x0 * u1 - u0 * x2;
    var delta_c = u0 * v1 * x2 + v0 * x1 * u2 + x0 * u1 * v2 - x0 * v1 * u2
      - v0 * u1 * x2 - u0 * x1 * v2;
    var delta_d = y0 * v1 + v0 * y2 + y1 * v2 - v1 * y2 - v0 * y1 - y0 * v2;
    var delta_e = u0 * y1 + y0 * u2 + u1 * y2 - y1 * u2 - y0 * u1 - u0 * y2;
    var delta_f = u0 * v1 * y2 + v0 * y1 * u2 + y0 * u1 * v2 - y0 * v1 * u2
      - v0 * u1 * y2 - u0 * y1 * v2;
    ctx.transform(delta_a / delta, delta_d / delta,
      delta_b / delta, delta_e / delta,
      delta_c / delta, delta_f / delta);
    ctx.drawImage(texture, 0, 0);
    ctx.restore();
  }

  function map(p) {
    return [p[0] * 10, p[1] * 10];
  }

  function mapInv(p) {
    return [p[0] / 10, p[1] / 10];
  }
}