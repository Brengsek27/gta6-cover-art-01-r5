const cream = "#fff7df";
const plum = "#24132e";
const gold = "#e5a92f";
const captions = {
  boulevard: "OCEAN DRIVE · 6:42 PM · GOLDEN HOUR",
  pier: "PIER 9 · 5:17 PM · ONE LAST CAST",
  marina: "MARINA DEL SOL · 7:40 PM · NO WITNESSES",
  street: "VICE STRIP · 8:03 PM · FULL THROTTLE",
  user: "YOUR SCENE · RIGHT NOW · MAIN CHARACTER",
};
const grades = {
  sunset: [1.34, "#ff782f", "#ee6292", "#ffa347"],
  neon: [1.4, "#ff422b", "#ff46ab", "#ff8b43"],
  golden: [1.3, "#ff9b38", "#e67c83", "#ffbe4c"],
  vivid: [1.4, "#ff693b", "#ed528d", "#ffb261"],
};

function fill(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function rounded(ctx, color, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function bold(ctx, size) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
}

function photo(ctx, image, name, options, x, y, width, height, anchor) {
  if (!image) return;
  const [saturation, orange, pink, amber] = grades[options.grade] ?? grades.sunset;
  const scale = Math.max(width / image.width, height / image.height) * options.zoom;
  const wide = image.width * scale;
  const tall = image.height * scale;
  const crop = anchor ?? (name === "pier" ? 0 : name === "boulevard" ? .06 : .5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  fill(ctx, plum, x, y, width, height);
  ctx.filter = `saturate(${saturation}) contrast(1.05)`;
  ctx.drawImage(image, x + (width - wide) / 2, y + (height - tall) * (tall > height ? crop : .5), wide, tall);
  ctx.filter = "none";
  const washes = [
    ["saturation", orange, options.grade === "neon" ? .22 : .13],
    ["soft-light", pink, .26],
    ["screen", amber, name === "pier" ? .12 : .07],
  ];
  if (name === "pier") washes.push(["multiply", "#f0ab79", .34]);
  if (options.ink) washes.push(["multiply", "#2a1236", .12]);
  for (const [mode, color, opacity] of washes) {
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = opacity;
    fill(ctx, color, x, y, width, height);
  }
  ctx.restore();
}

function chip(ctx, name, unit, width, height, rim, right, limit) {
  const text = captions[name] ?? captions.user;
  const pad = unit * (limit ? .006 : .009);
  const size = unit * .0105;
  bold(ctx, size);
  const textWidth = Math.min(ctx.measureText(text).width, limit ?? Infinity, width - 2 * rim - 5 * pad);
  const pillWidth = textWidth + 3.4 * pad;
  const x = right ? width - rim - pad - pillWidth : rim + pad;
  const y = height - rim - pad - 2.45 * pad;
  rounded(ctx, "rgba(20,8,31,.91)", x, y, pillWidth, 2.45 * pad, 1.23 * pad);
  ctx.beginPath();
  ctx.arc(x + pad, y + 1.225 * pad, .25 * pad, 0, Math.PI * 2);
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.fillStyle = cream;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 1.8 * pad, y + 1.23 * pad, textWidth);
}

function panel(ctx, image, name, options, position, width, height) {
  const [left, top, wide, tall, angle = 0, right = false, anchor, limit] = position;
  const panelWidth = wide * width;
  const panelHeight = tall * height;
  const unit = Math.min(width, height);
  const rim = .007 * width;
  ctx.save();
  ctx.translate(left * width + panelWidth / 2, top * height + panelHeight / 2);
  ctx.rotate(angle);
  ctx.translate(-panelWidth / 2, -panelHeight / 2);
  ctx.shadowColor = "rgba(13,4,23,.8)";
  ctx.shadowBlur = unit * .025;
  ctx.shadowOffsetX = -unit * .008;
  ctx.shadowOffsetY = unit * .013;
  fill(ctx, cream, 0, 0, panelWidth, panelHeight);
  ctx.shadowColor = "transparent";
  photo(ctx, image, name, options, rim, rim, panelWidth - 2 * rim, panelHeight - 2 * rim, anchor);
  chip(ctx, name, unit, panelWidth, panelHeight, rim, right, limit && limit * width);
  ctx.restore();
}

function lettering(ctx, options, width, height) {
  const settings = {
    collage: [.105, .145, .71, .62],
    stack: [.09, .102, .82, .63],
    tilt: [.075, .108, .855, .64],
  };
  const [across, down, baseline, subtitleX] = settings[options.layout] ?? [.10, .12, .79, .62];
  const size = Math.min(width * across, height * down);
  const titleWidth = options.layout === "collage" ? Math.min(width * .82, width * .49) : width * .89;
  const x = width * (options.layout === "collage" ? .295 : .5);
  const y = height * baseline;
  const title = options.caption.toUpperCase();
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = size / 9;
  ctx.strokeStyle = "#170921";
  ctx.fillStyle = "#170921";
  ctx.strokeText(title, x - size * .025, y + size * .065, titleWidth);
  ctx.fillText(title, x - size * .025, y + size * .065, titleWidth);
  ctx.strokeText(title, x, y, titleWidth);
  const gradient = ctx.createLinearGradient(0, y - size * .76, 0, y);
  gradient.addColorStop(0, cream);
  gradient.addColorStop(.53, "#ffca69");
  gradient.addColorStop(1, "#ff873d");
  ctx.fillStyle = gradient;
  ctx.fillText(title, x, y, titleWidth);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y - size, width, size * .38);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,.43)";
  ctx.lineWidth = Math.max(1, size * .009);
  ctx.strokeText(title, x, y, titleWidth);
  ctx.restore();
  const script = options.layout === "collage" ? size * .35 : Math.max(24, size * .35);
  const scriptWidth = width * (options.layout === "collage" ? .36 : .61);
  ctx.translate(width * subtitleX, y + script * .83);
  ctx.rotate(-Math.PI / 60);
  ctx.font = `${script}px Pacifico, cursive`;
  ctx.lineWidth = script * .13;
  ctx.strokeText(options.sub, 0, 0, scriptWidth);
  ctx.shadowColor = "#ff65b0";
  ctx.shadowBlur = script * .22;
  ctx.fillStyle = "#ff65b0";
  ctx.fillText(options.sub, 0, 0, scriptWidth);
  ctx.restore();
}

function footer(ctx, width, height) {
  const unit = Math.min(width, height);
  const top = height * .93;
  const left = width * .035;
  const box = unit * .056;
  const center = height * .959;
  fill(ctx, "#14081f", 0, top, width, height - top);
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = unit * .0015;
  ctx.strokeRect(left, center - box / 2, box, box);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = cream;
  ctx.font = `${box * .60}px Anton, sans-serif`;
  ctx.fillText("NC", left + box / 2, center);
  ctx.textAlign = "left";
  bold(ctx, unit * .013);
  ctx.fillText("NEON COAST EDITION", left + box * 1.25, center - unit * .009);
  bold(ctx, unit * .009);
  ctx.fillText("MAKE YOUR OWN LEGEND · VOL. 06", left + box * 1.25, center + unit * .009);
  const barcodeWidth = unit * .134;
  const barcodeX = width - left - barcodeWidth;
  const barcodeY = top + unit * .009;
  for (let index = 0; index < 18; index++) {
    const lineWidth = unit * (index % 5 === 0 ? .0042 : index % 3 === 0 ? .0027 : .0013);
    fill(ctx, gold, barcodeX + index * barcodeWidth / 18, barcodeY, lineWidth, unit * .024);
  }
  ctx.fillStyle = cream;
  ctx.textAlign = "center";
  bold(ctx, unit * .008);
  ctx.textBaseline = "alphabetic";
  ctx.fillText("0 02026 NC001", barcodeX + barcodeWidth / 2, barcodeY + unit * .034);
  bold(ctx, unit * .0055);
  ctx.textAlign = "left";
  ctx.fillText("NEON COAST STUDIO · AN INDEPENDENT PICTURE · YOUR CITY. YOUR STORY. YOUR RULES.", left, height - unit * .010);
  ctx.textAlign = "right";
  ctx.fillText("EST. MMXXVI", width - left, height - unit * .010);
  ctx.restore();
}

function starPath(ctx, points, radius, inner) {
  ctx.beginPath();
  for (let point = 0; point < points * 2; point++) {
    const angle = point * Math.PI / points - Math.PI / 2;
    const distance = point % 2 ? radius * inner : radius;
    ctx.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
  ctx.closePath();
}

function seal(ctx, width, height, tilt) {
  const radius = width * (tilt ? .04 : .055);
  ctx.save();
  ctx.translate(width * (tilt ? .90 : .78), height * (tilt ? .675 : .58));
  ctx.rotate(.12);
  ctx.shadowColor = "rgba(12,4,20,.65)";
  ctx.shadowBlur = radius * .20;
  ctx.shadowOffsetY = radius * .08;
  starPath(ctx, 32, radius, .90);
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(0, 0, radius * .82, 0, Math.PI * 2);
  ctx.setLineDash([radius * .055, radius * .035]);
  ctx.lineWidth = radius * .018;
  ctx.strokeStyle = cream;
  ctx.stroke();
  ctx.fillStyle = "#291528";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  bold(ctx, radius * .15);
  ctx.fillText("LIMITED EDITION", 0, -radius * .53, radius * 1.19);
  ctx.fillText("NO. 001 / NC", 0, radius * .56);
  ctx.font = `${radius * .44}px Anton, sans-serif`;
  ctx.fillText("VICE", 0, -radius * .19);
  ctx.fillText("HEAT", 0, radius * .22);
  ctx.restore();
}

function starsBadge(ctx, sticker, width, height) {
  const x = width * .78;
  const y = height * .055;
  const wide = width * .19;
  const tall = height * .095;
  ctx.save();
  rounded(ctx, "rgba(20,8,31,.93)", x, y, wide, tall, tall * .15);
  ctx.fillStyle = gold;
  for (let index = -2; index <= 2; index++) {
    ctx.save();
    ctx.translate(x + wide * (.5 + index * .135), y + tall * .37);
    starPath(ctx, 5, Math.min(wide * .055, tall * .18), .45);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = cream;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  bold(ctx, Math.min(tall * .18, wide * .075));
  ctx.fillText(sticker.toUpperCase(), x + wide / 2, y + tall * .75, wide * .86);
  ctx.restore();
}

function atmosphere(ctx, width, height, grain) {
  const vignette = ctx.createRadialGradient(width / 2, height * .45, Math.min(width, height) * .27,
    width / 2, height * .45, Math.hypot(width, height) * .55);
  vignette.addColorStop(0, "rgba(19,5,26,0)");
  vignette.addColorStop(1, "rgba(19,5,26,.43)");
  fill(ctx, vignette, 0, 0, width, height * .93);
  if (!grain) return;
  for (let pixel = 0; pixel < width * height / 220; pixel++) {
    ctx.fillStyle = pixel % 2 ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)";
    ctx.fillRect(Math.floor(Math.random() * width), Math.floor(Math.random() * height * .93), 1, 1);
  }
}

export function drawCover(canvas, photos, options) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const { names = [], layout } = options;
  const layouts = {
    collage: [[.035, .035, .52, .76], [.57, .035, .395, .45], [.57, .51, .395, .185, 0, true], [.035, .81, .93, .115]],
    stack: [[.05, .04, .90, .43, 0, false, .04], [.05, .49, .43, width > height ? .22 : .25], [.52, .49, .43, width > height ? .22 : .25], [.05, .76, .90, .165]],
    duo: [[.035, .035, .455, .78], [.51, .035, .455, .78]],
    hero: [[.035, .035, .93, .84]],
    tilt: [[.06, .10, .37, .52, -.1, false, undefined, .185], [.31, .16, .42, .58], [.66, .22, .29, .38, .09]],
  };
  fill(ctx, plum, 0, 0, width, height);
  if (layout === "tilt") {
    photo(ctx, photos[3] ?? photos[0], names[3] ?? names[0], options, 0, 0, width, height * .93);
    fill(ctx, "rgba(36,19,46,.30)", 0, 0, width, height * .93);
    const sunX = width * .78;
    const sunY = height * .24;
    const radius = width * .12;
    const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, radius);
    sun.addColorStop(0, "rgba(255,218,138,.95)");
    sun.addColorStop(.88, "rgba(255,188,77,.85)");
    sun.addColorStop(1, "rgba(255,175,55,.65)");
    ctx.save();
    ctx.shadowColor = "rgba(255,175,55,.85)";
    ctx.shadowBlur = width * .075;
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const [index, position] of (layouts[layout] ?? layouts.collage).entries()) {
    if (photos.length) panel(ctx, photos[index % photos.length], names[index % photos.length], options, position, width, height);
  }
  atmosphere(ctx, width, height, options.grain);
  if (layout === "collage") {
    const unit = Math.min(width, height);
    bold(ctx, unit * .013);
    ctx.lineWidth = unit * .004;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(28,12,34,.75)";
    ctx.fillStyle = cream;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const review = "★★★★★  “PURE GOLDEN-HOUR MAYHEM” — THE LEONIDA POST";
    ctx.strokeText(review, width * .06, height * .548, width * .48);
    ctx.fillText(review, width * .06, height * .548, width * .48);
  }
  seal(ctx, width, height, layout === "tilt");
  lettering(ctx, options, width, height);
  if (options.stars) starsBadge(ctx, options.sticker, width, height);
  footer(ctx, width, height);
  const frame = Math.min(width, height) * .0035;
  ctx.lineWidth = Math.max(1, frame * .44);
  ctx.strokeStyle = cream;
  ctx.strokeRect(frame, frame, width - 2 * frame, height - 2 * frame);
}
