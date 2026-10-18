
(() => {
  const $ = (id) => document.getElementById(id);

  let mode = "plan";
  let audioBlob = null;
  let recorder = null;
  let chunks = [];
  let timer = null;
  let seconds = 0;

  const examples = {
    plan: "I have an assignment due tomorrow, need to prepare for an interview this weekend, and buy groceries. Help me organize my time.",
    reflect: "I feel overwhelmed today. There are many things I need to do, and I am worried I will disappoint people if I cannot finish everything."
  };

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function count() {
    $("count").textContent =
      `${$("userText").value.length} / ${$("userText").maxLength}`;
  }

  // Switch between the two modes.
  function setMode(next) {
    mode = next;

    $("planTab").classList.toggle("active", mode === "plan");
    $("reflectTab").classList.toggle("active", mode === "reflect");

    $("notice").textContent = mode === "plan"
      ? "Turn a messy to-do list into a clear, doable plan."
      : "A gentle reflection space, not therapy or medical advice.";

    $("label").textContent = mode === "plan"
      ? "What would you like to get done?"
      : "What's on your mind?";

    $("userText").placeholder = mode === "plan"
      ? "For example: I have an assignment due tomorrow..."
      : "Share what you're feeling, in your own language...";

    $("submitText").textContent = mode === "plan"
      ? "Build my plan"
      : "Reflect with me";

    $("emptyTitle").textContent = mode === "plan"
      ? "Your plan starts here."
      : "A space to let it out.";

    $("emptyCopy").textContent = mode === "plan"
      ? "Share what's on your list and we'll turn it into clear next steps."
      : "Share what you're carrying. You'll receive a gentle reflection, one request at a time.";

    $("loadingTitle").textContent = mode === "plan"
      ? "Putting things in order…"
      : "Taking a moment to reflect…";

    $("modeEyebrow").textContent = mode === "plan"
      ? "GET ORGANIZED"
      : "TAKE A BREATH";

    $("modeHeading").textContent = mode === "plan"
      ? "Let's make a plan."
      : "Let it all out.";

    $("modeDescription").textContent = mode === "plan"
      ? "Get everything out of your head and turn it into clear next steps."
      : "Share what you're feeling. You don't need to have all the answers.";

    $("resultContent").classList.add("hidden");
    $("empty").classList.remove("hidden");
    $("loading").classList.add("hidden");
    $("error").classList.add("hidden");
    $("submit").disabled = false;

    count();
  }

  // FIRST SCREEN: mode selection.
  $("choosePlan").addEventListener("click", () => {
    setMode("plan");
    $("welcomeScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("userText").focus();
  });

  $("chooseReflect").addEventListener("click", () => {
    setMode("reflect");
    $("welcomeScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("userText").focus();
  });

  $("backHome").addEventListener("click", () => {
    $("appScreen").classList.add("hidden");
    $("welcomeScreen").classList.remove("hidden");
    $("error").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Compatibility with the hidden mode tabs.
  $("planTab").addEventListener("click", () => setMode("plan"));
  $("reflectTab").addEventListener("click", () => setMode("reflect"));

  $("example").addEventListener("click", () => {
    $("userText").value = examples[mode];
    count();
  });

  $("userText").addEventListener("input", count);

  function showError(message) {
    $("error").textContent = message;
    $("error").classList.remove("hidden");
  }

  function clearAudio() {
    audioBlob = null;
    $("audioPreview").classList.add("hidden");
    $("audioUpload").value = "";
    $("voiceStatus").textContent = "Up to 90 seconds";
    $("recordLabel").textContent = "Record voice";
    $("record").classList.remove("recording");
  }

  $("removeAudio").addEventListener("click", clearAudio);

  // Voice recording.
  $("record").addEventListener("click", async () => {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      $("audioUpload").click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const type = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find((format) => MediaRecorder.isTypeSupported(format));

      recorder = type
        ? new MediaRecorder(stream, { mimeType: type })
        : new MediaRecorder(stream);

      chunks = [];
      seconds = 0;

      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        clearInterval(timer);
        timer = null;

        audioBlob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm"
        });

        if (audioBlob.size > 4 * 1024 * 1024) {
          clearAudio();
          showError("Recording is too large. Try a shorter note.");
          return;
        }

        $("audioName").textContent = `Voice note ready (${seconds}s)`;
        $("audioPreview").classList.remove("hidden");
        $("record").classList.remove("recording");
        $("recordLabel").textContent = "Record again";
        $("voiceStatus").textContent = "Ready to submit";
      };

      recorder.start();

      $("record").classList.add("recording");
      $("recordLabel").textContent = "Stop recording";
      $("voiceStatus").textContent = "Recording… 0s / 90s";

      timer = setInterval(() => {
        seconds++;
        $("voiceStatus").textContent =
          `Recording… ${seconds}s / 90s`;

        if (seconds >= 90 && recorder.state === "recording") {
          recorder.stop();
        }
      }, 1000);

    } catch (error) {
      $("voiceStatus").textContent =
        "Microphone unavailable. Upload audio instead.";
      $("audioUpload").click();
    }
  });

  $("audioUpload").addEventListener("change", () => {
    const file = $("audioUpload").files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      clearAudio();
      showError("Audio must be under 4 MB.");
      return;
    }

    audioBlob = file;
    $("audioName").textContent = file.name;
    $("audioPreview").classList.remove("hidden");
    $("voiceStatus").textContent = "Ready to submit";
  });

  // Export helpers.
  function markdown(data) {
    return `# FlowSpace AI Plan

${data.summary || ""}

${(data.tasks || []).map((task) =>
  `- [ ] **${task.title}** — ${task.priority || "medium"} priority` +
  `${task.date ? "; " + task.date : ""}` +
  `${task.start ? " at " + task.start : ""}` +
  `; ${task.duration_min || 30} min` +
  `${task.note ? "\n  - " + task.note : ""}`
).join("\n")}
`;
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(
      new Blob([content], { type })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      showError("Copy failed. You can select the result text manually.");
    }
  }

  function actionButton(label, id) {
    return `<button type="button" class="small-btn" id="${id}">${label}</button>`;
  }

  function transcript(value) {
    return value
      ? `<details class="transcript">
           <summary>What I heard</summary>
           <p>${esc(value)}</p>
         </details>`
      : "";
  }

  // Render the plan.
  function renderPlan(data) {
    const tasks = data.tasks || [];

    const highPriority = tasks.filter(
      (task) => task.priority === "high"
    ).length;

    const minutes = tasks.reduce(
      (total, task) => total + (+task.duration_min || 0),
      0
    );

    const cards = tasks.map((task, index) => `
      <article class="task">
        <span class="stripe ${esc(task.priority || "medium")}"></span>
        <div>
          <p class="task-title">${index + 1}. ${esc(task.title)}</p>
          ${task.note
            ? `<p class="task-note">${esc(task.note)}</p>`
            : ""}
          <div class="tags">
            <span class="tag ${esc(task.priority || "medium")}">
              ${esc((task.priority || "medium").toUpperCase())}
            </span>
            ${task.date
              ? `<span class="tag">${esc(task.date)}${task.start
                  ? " · " + esc(task.start)
                  : ""}</span>`
              : ""}
            <span class="tag">${+task.duration_min || 30} min</span>
          </div>
        </div>
      </article>
    `).join("");

    $("resultContent").innerHTML = `
      <div class="result-head">
        <div>
          <div class="kicker">YOUR PLAN</div>
          <h2>One step at a time.</h2>
        </div>
        ${actionButton("Copy plan", "copyPlan")}
      </div>

      ${data.summary
        ? `<p class="summary">${esc(data.summary)}</p>`
        : ""}

      <div class="stats">
        <div class="stat">
          <strong>${tasks.length}</strong>
          <span>Tasks</span>
        </div>
        <div class="stat">
          <strong>${highPriority}</strong>
          <span>High priority</span>
        </div>
        <div class="stat">
          <strong>${Math.round(minutes / 60 * 10) / 10}h</strong>
          <span>Estimated time</span>
        </div>
      </div>

      ${transcript(data.transcript)}

      <div class="tasks">
        ${cards || "<p>No clear action items found. Try adding a specific task.</p>"}
      </div>

      <div class="exports">
        ${actionButton("Download CSV", "csv")}
        ${actionButton("Download Markdown", "md")}
        ${actionButton("Calendar (.ics)", "ics")}
        ${actionButton("Print / PDF", "print")}
      </div>

      <button type="button" class="bridge" id="toReflect">
        ♡ Reflect on this plan instead ↗
      </button>
    `;

    $("copyPlan").addEventListener("click", () =>
      copyText(markdown(data))
    );

    $("md").addEventListener("click", () => {
      download(
        "flowspace-plan.md",
        markdown(data),
        "text/markdown;charset=utf-8"
      );
    });

    $("csv").addEventListener("click", () => {
      const quote = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

      const rows = [
        ["Task", "Priority", "Date", "Start", "Duration (min)", "Note"],
        ...tasks.map((task) => [
          task.title,
          task.priority,
          task.date,
          task.start,
          task.duration_min,
          task.note
        ])
      ];

      const csv = rows
        .map((row) => row.map(quote).join(","))
        .join("\r\n");

      download(
        "flowspace-plan.csv",
        csv,
        "text/csv;charset=utf-8"
      );
    });

    $("ics").addEventListener("click", () => {
      const escapeICS = (value) =>
        String(value || "")
          .replace(/\\/g, "\\\\")
          .replace(/,/g, "\\,")
          .replace(/;/g, "\\;")
          .replace(/\n/g, "\\n");

      const events = tasks
        .filter((task) => task.date && task.start)
        .map((task) => {
          const startDate = task.date.replace(/-/g, "");
          const startTime = task.start.replace(":", "") + "00";
          const start = `${startDate}T${startTime}`;

          const endDate = new Date(
            `${task.date}T${task.start}:00`
          );

          endDate.setMinutes(
            endDate.getMinutes() + (+task.duration_min || 30)
          );

          const pad = (number) => String(number).padStart(2, "0");

          const end =
            `${endDate.getFullYear()}` +
            `${pad(endDate.getMonth() + 1)}` +
            `${pad(endDate.getDate())}T` +
            `${pad(endDate.getHours())}` +
            `${pad(endDate.getMinutes())}00`;

          return [
            "BEGIN:VEVENT",
            `UID:${crypto.randomUUID()}@flowspaceai`,
            `DTSTART:${start}`,
            `DTEND:${end}`,
            `SUMMARY:${escapeICS(task.title)}`,
            "END:VEVENT"
          ].join("\r\n");
        });

      const calendar = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FlowSpaceAI//EN",
        ...events,
        "END:VCALENDAR"
      ].join("\r\n");

      download(
        "flowspace-plan.ics",
        calendar,
        "text/calendar;charset=utf-8"
      );
    });

    $("print").addEventListener("click", () => window.print());

    $("toReflect").addEventListener("click", () => {
      setMode("reflect");

      const items = tasks
        .map((task) => task.title)
        .filter(Boolean);

      $("userText").value =
        `I made this plan: ${items.join(", ")}. ` +
        "Help me reflect on how I feel about it and how to approach it without feeling overwhelmed.";

      count();
      $("userText").focus();
    });
  }

  // Render the reflection.
  function renderReflect(data) {
    if (data.crisis) {
      $("resultContent").innerHTML = `
        <div class="crisis">
          <div class="kicker">SUPPORT MATTERS</div>
          <h2>You don't have to handle this alone.</h2>
          <p>${esc(data.message ||
            "Please contact someone you trust or emergency services if you are in danger.")}</p>
          ${(data.helplines || []).map((line) => `
            <div class="helpline">
              <strong>${esc(line.name)}</strong>
              ${esc(line.contact)}
            </div>
          `).join("")}
        </div>
        ${transcript(data.transcript)}
      `;
      return;
    }

    const feelings = (data.feelings || [])
      .map((feeling) =>
        `<span class="feeling">${esc(feeling)}</span>`
      )
      .join("");

    $("resultContent").innerHTML = `
      <div class="result-head">
        <div>
          <div class="kicker">VENT & REFLECT</div>
          <h2>Thank you for sharing.</h2>
        </div>
        ${actionButton("Copy reflection", "copyReflect")}
      </div>

      ${transcript(data.transcript)}

      <div class="feelings">${feelings}</div>

      <div class="block">
        <h3>♡ What I hear</h3>
        <p>${esc(data.reflection || "")}</p>
      </div>

      ${data.reframe ? `
        <div class="block">
          <h3>✦ A gentle reframe</h3>
          <p>${esc(data.reframe)}</p>
        </div>
      ` : ""}

      ${data.next_step ? `
        <div class="block">
          <h3>→ One small next step</h3>
          <p>${esc(data.next_step)}</p>
        </div>
      ` : ""}

      <button type="button" class="bridge" id="turnPlan">
        ✳ Turn this into a plan ↗
      </button>
    `;

    $("copyReflect").addEventListener("click", () => {
      copyText([
        data.reflection,
        data.reframe,
        data.next_step
      ].filter(Boolean).join("\n\n"));
    });

    $("turnPlan").addEventListener("click", () => {
      const previousText = $("userText").value;
      setMode("plan");

      $("userText").value =
        data.transcript || previousText;

      count();
      $("userText").focus();
    });
  }

  // Submit input to the existing Flask API.
  $("form").addEventListener("submit", async (event) => {
    event.preventDefault();

    $("error").classList.add("hidden");

    const value = $("userText").value.trim();

    if (!value && !audioBlob) {
      showError("Type something or record a voice note first.");
      return;
    }

    const formData = new FormData();

    formData.append("text", value);
    formData.append(
      "timezone",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    );

    if (audioBlob) {
      const type = audioBlob.type || "";

      const extension = type.includes("wav")
        ? "wav"
        : type.includes("mp4")
          ? "m4a"
          : type.includes("mpeg")
            ? "mp3"
            : type.includes("ogg")
              ? "ogg"
              : "webm";

      formData.append("audio", audioBlob, `voice-note.${extension}`);
    }

    $("submit").disabled = true;
    $("submitText").textContent = "Working…";
    $("empty").classList.add("hidden");
    $("resultContent").classList.add("hidden");
    $("loading").classList.remove("hidden");

    try {
      const response = await fetch(
        mode === "plan" ? "/api/plan" : "/api/reflect",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Something went wrong.");
      }

      if (mode === "plan") {
        renderPlan(data);
      } else {
        renderReflect(data);
      }

      $("loading").classList.add("hidden");
      $("resultContent").classList.remove("hidden");

    } catch (error) {
      $("loading").classList.add("hidden");
      $("empty").classList.remove("hidden");

      showError(
        error.message || "Could not reach Gemini. Please try again."
      );

    } finally {
      $("submit").disabled = false;
      $("submitText").textContent = mode === "plan"
        ? "Build my plan"
        : "Reflect with me";
    }
  });

  // Start with the welcome screen visible.
  $("welcomeScreen").classList.remove("hidden");
  $("appScreen").classList.add("hidden");

  count();
})();
