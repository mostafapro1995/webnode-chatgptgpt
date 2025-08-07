// DOM Elements
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const uploadImage = document.getElementById("uploadImage");
const uploadAudio = document.getElementById("uploadAudio");
const uploadVideo = document.getElementById("uploadVideo");
const recordBtn = document.getElementById("startRecord");
const screenRecordBtn = document.getElementById("screenRecord");
const recordingIndicator = document.getElementById("recording-indicator");

const SERVER_URL = "https://your-server-url.onrender.com"; // غيّر الرابط عند النشر

// إرسال رسالة إلى السيرفر
async function sendToOpenAI(message) {
  try {
    const res = await fetch(`${SERVER_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    return data.reply || "لم يتم الحصول على رد.";
  } catch (error) {
    console.error("فشل الاتصال بالسيرفر:", error);
    return "تعذر الاتصال بالسيرفر.";
  }
}

// رفع ملفات للسيرفر (NFT.storage)
async function uploadToServer(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${SERVER_URL}/upload`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.url;
  } catch (err) {
    console.error("فشل رفع الملف:", err);
    alert("حدث خطأ أثناء رفع الملف.");
  }
}

// تفريغ صوت عبر السيرفر (AssemblyAI)
async function transcribeAudio(file) {
  const formData = new FormData();
  formData.append("audio", file);

  try {
    const res = await fetch(`${SERVER_URL}/transcribe`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.text || "لم يتم تفريغ الصوت.";
  } catch (err) {
    console.error("خطأ في تفريغ الصوت:", err);
    return "تعذر تفريغ الصوت.";
  }
}

// عرض رسالة في الشات
function appendMessage(content, sender = "user", isMedia = false) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = isMedia ? content : content.replace(/\n/g, "<br>");
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// إرسال نص
sendBtn.onclick = async () => {
  const text = input.value.trim();
  if (!text) return;
  appendMessage(text, "user");
  input.value = "";
  const reply = await sendToOpenAI(text);
  appendMessage(reply, "bot");
};

// إرسال بالإنتر
input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendBtn.click();
});

// تحميل صورة
uploadImage.onchange = async () => {
  const file = uploadImage.files[0];
  if (!file) return;
  const url = await uploadToServer(file);
  appendMessage(`<img src="${url}" alt="صورة">`, "user", true);
  const reply = await sendToOpenAI(`انظر إلى هذه الصورة: ${url}`);
  appendMessage(reply, "bot");
};

// تحميل فيديو
uploadVideo.onchange = async () => {
  const file = uploadVideo.files[0];
  if (!file) return;
  const url = await uploadToServer(file);
  appendMessage(`<video src="${url}" controls></video>`, "user", true);
  const reply = await sendToOpenAI(`هذا الفيديو: ${url}`);
  appendMessage(reply, "bot");
};

// تحميل صوت
uploadAudio.onchange = async () => {
  const file = uploadAudio.files[0];
  if (!file) return;
  const url = await uploadToServer(file);
  appendMessage(`<audio src="${url}" controls></audio>`, "user", true);
  const transcript = await transcribeAudio(file);
  const reply = await sendToOpenAI(`تم تفريغ الصوت: ${transcript}`);
  appendMessage(reply, "bot");
};

// تسجيل صوت مباشر
let mediaRecorder;
let chunks = [];

recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordingIndicator.style.display = "none";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      chunks = [];
      const url = URL.createObjectURL(blob);
      appendMessage(`<audio src="${url}" controls></audio>`, "user", true);
      const transcript = await transcribeAudio(blob);
      const reply = await sendToOpenAI(`تفريغ التسجيل: ${transcript}`);
      appendMessage(reply, "bot");
    };

    mediaRecorder.start();
    recordingIndicator.style.display = "inline-block";

  } catch (err) {
    console.error("فشل تسجيل الصوت:", err);
    alert("لم يتم السماح باستخدام الميكروفون.");
  }
};

// تسجيل شاشة
screenRecordBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const recorder = new MediaRecorder(stream);
    const screenChunks = [];

    recorder.ondataavailable = e => screenChunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(screenChunks, { type: "video/webm" });
      const url = await uploadToServer(blob);
      appendMessage(`<video src="${url}" controls></video>`, "user", true);
      const reply = await sendToOpenAI(`فيديو الشاشة: ${url}`);
      appendMessage(reply, "bot");
    };

    recorder.start();
    setTimeout(() => recorder.stop(), 10000);

  } catch (err) {
    console.error("فشل تسجيل الشاشة:", err);
    alert("لم يتم منح إذن مشاركة الشاشة.");
  }
};