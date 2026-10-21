
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let mode = "plan";
  let audioBlob = null;
  let recorder = null;
  let recordingTimer = null;
  let recordingSeconds = 0;

  const colors = ["pink", "blue", "purple", "orange", "green"];

  const examples = {
    plan: "Python study, homework assignment, exercise, Java practice.",
    reflect: "I feel overwhelmed by everything I need to do. I want to feel calmer and more confident."
  };

  const escapeHTML = (value) =>
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

  function showError(message) {
    $("error").textContent = message;
    $("error").classList.remove("hidden");
  }

  function setMode(nextMode) {
    mode = nextMode;

    $("notice").textContent = mode === "plan"
      ? "Turn your tasks into a clear, colorful visual timeline."
      : "A gentle space to express your thoughts without judgment.";

    $("label").textContent = mode === "plan"
      ? "What would you like to get done?"
      : "What's on your mind?";

    $("userText").placeholder = mode === "plan"
      ? "For example: study Python, finish homework, exercise..."
      : "Write whatever is on your mind...";

    $("submitText").textContent = mode === "plan"
      ? "Build my plan"
      : "Reflect with me";

    $("emptyTitle").textContent = mode === "plan"
      ? "Your plan starts here."
      : "A space to let it out.";

    $("emptyCopy").textContent = mode === "plan"
      ? "Share your tasks to create a colorful visual timeline."
      : "Share your thoughts and get a gentle, supportive reflection.";

    $("loadingTitle").textContent = mode === "plan"
      ? "Organizing your tasks..."
      : "Taking a moment to reflect...";

    $("modeEyebrow").textContent = mode === "plan"
      ? "GET ORGANIZED"
      : "TAKE A BREATH";

    $("modeHeading").textContent = mode === "plan"
      ? "Let's make a plan."
      : "Let it all out.";

    $("modeDescription").textContent = mode === "plan"
      ? "Turn your ideas into colorful task cards and a visual timeline."
      : "Explore your feelings and find one gentle next step.";

    $("resultContent").classList.add("hidden");
    $("empty").classList.remove("hidden");
    $("loading").classList.add("hidden");
    $("error").classList.add("hidden");
    count();
  }

  $("choosePlan").addEventListener("click", () => {
    setMode("plan");
    $("welcomeScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("chooseReflect").addEventListener("click", () => {
    setMode("reflect");
    $("welcomeScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("backHome").addEventListener("click", () => {
    $("appScreen").classList.add("hidden");
    $("welcomeScreen").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("planTab").addEventListener("click", () => setMode("plan"));
  $("reflectTab").addEventListener("click", () => setMode("reflect"));

  $("example").addEventListener("click", () => {
    $("userText").value = examples[mode];
    count();
  });

  $("userText").addEventListener("input", count);

  function priorityOf(task) {
    const priority = String(task.priority || "medium").toLowerCase();
    return ["high", "medium", "low"].includes(priority)
      ? priority
      : "medium";
  }

  function durationOf(task) {
    const duration = Number(task.duration_min);
    return Number.isFinite(duration) && duration > 0 ? duration : 30;
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
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
    } catch {
      showError("Copy failed. Please select and copy the text manually.");
    }
  }

  function planMarkdown(data) {
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];

    return `# FlowSpace AI Plan

${data.summary || ""}

${tasks.map((task) =>
  `- [ ] ${task.title || "Untitled task"} — ${priorityOf(task)} priority, ${durationOf(task)} minutes` +
  (task.note ? `\n  ${task.note}` : "")
).join("\n")}
`;
  }

  function transcriptHTML(data) {
    if (!data.transcript) return "";

    return `
      <details class="transcript">
        <summary>What I heard</summary>
        <p>${escapeHTML(data.transcript)}</p>
      </details>
    `;
  }

  function priorityHTML(task) {
    const priority = priorityOf(task);

    return `<span class="priority-badge ${priority}">${priority.toUpperCase()}</span>`;
  }

  // Each task appears once, as a colorful card.
  function taskCards(tasks) {
    return tasks.map((task, index) => {
      const color = colors[index % colors.length];
      const priority = priorityOf(task);

      return `
        <article class="color-task-card ${color} priority-${priority}">
          <div class="color-task-top">
            <span class="color-task-number">${String(index + 1).padStart(2, "0")}</span>
            ${priorityHTML(task)}
          </div>

          <h3>${escapeHTML(task.title || "Untitled task")}</h3>

          ${task.note
            ? `<p>${escapeHTML(task.note)}</p>`
            : `<p class="task-placeholder">One step at a time.</p>`}

          <div class="color-task-footer">
            <span>◷ ${durationOf(task)} min</span>
            <span>${priority === "high" ? "★ Focus first" :
              priority === "medium" ? "✦ Keep moving" : "♡ When ready"}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  // One visual timeline. No calendar and no fixed clock times.
  function timelineHTML(tasks) {
    if (!tasks.length) {
      return `<div class="visual-empty">Your timeline will appear here when tasks are available.</div>`;
    }

    const total = tasks.reduce((sum, task) => sum + durationOf(task), 0);
    let elapsed = 0;

    const bars = tasks.map((task, index) => {
      const duration = durationOf(task);
      const left = total ? (elapsed / total) * 100 : 0;
      const width = total ? (duration / total) * 100 : 100;
      const color = colors[index % colors.length];

      elapsed += duration;

      return `
        <div class="visual-timeline-item ${color}"
             style="--timeline-left:${left}%;--timeline-width:${width}%"
             title="${escapeHTML(task.title)} — ${duration} minutes">
          <span class="timeline-marker">${index + 1}</span>
          <span class="timeline-task-name">${escapeHTML(task.title || "Task")}</span>
          <span class="timeline-task-duration">${duration} min</span>
        </div>
      `;
    }).join("");

    return `
      <section class="visual-timeline">
        <div class="visual-timeline-heading">
          <div>
            <span class="visual-eyebrow">YOUR FLOW</span>
            <h3>Your task timeline</h3>
            <p>A visual overview of your planned work.</p>
          </div>
          <span class="timeline-total">${Math.round(total / 60 * 10) / 10} hrs</span>
        </div>

        <div class="timeline-track">${bars}</div>
        <p class="timeline-caption">${tasks.length} tasks · ${total} minutes in total</p>
      </section>
    `;
  }

  function renderPlan(data) {
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];

    $("resultContent").innerHTML = `
      <div class="results-header">
        <div>
          <span class="visual-eyebrow">YOUR PLAN IS READY</span>
          <h2>Look what you can accomplish ✨</h2>
          <p>Your tasks, organized into one colorful view.</p>
        </div>
        <button type="button" class="export-button" id="copyPlan">Copy plan</button>
      </div>

      ${data.summary
        ? `<div class="plan-summary-card"><span>✦</span><p>${escapeHTML(data.summary)}</p></div>`
        : ""}

      ${transcriptHTML(data)}

      <div class="plan-overview">
        <div class="overview-card overview-pink">
          <span class="overview-icon">✿</span>
          <strong>${tasks.length}</strong>
          <span>Total tasks</span>
        </div>
        <div class="overview-card overview-blue">
          <span class="overview-icon">⚡</span>
          <strong>${tasks.filter(t => priorityOf(t) === "high").length}</strong>
          <span>High priority</span>
        </div>
        <div class="overview-card overview-purple">
          <span class="overview-icon">◷</span>
          <strong>${Math.round(tasks.reduce((sum, t) => sum + durationOf(t), 0) / 60 * 10) / 10}h</strong>
          <span>Estimated effort</span>
        </div>
      </div>

      <section class="color-task-section">
        <div class="color-section-heading">
          <div>
            <span class="visual-eyebrow">YOUR TASKS</span>
            <h3>Every step counts</h3>
          </div>
          <span class="task-count-pill">${tasks.length} tasks</span>
        </div>

        <div class="color-task-grid">
          ${tasks.length
            ? taskCards(tasks)
            : `<div class="visual-empty">No tasks were returned. Try describing your tasks in more detail.</div>`}
        </div>
      </section>

      ${timelineHTML(tasks)}

      <div class="export-toolbar">
        <button type="button" class="export-button" id="csv">Download CSV</button>
        <button type="button" class="export-button" id="md">Download Markdown</button>
        <button type="button" class="export-button" id="ics">Calendar (.ics)</button>
        <button type="button" class="export-button" id="print">Print / Save PDF</button>
      </div>

      <button type="button" class="export-button" id="toReflect">♡ Reflect on my plan</button>
    `;

    $("copyPlan").addEventListener("click", () => copyText(planMarkdown(data)));

    $("md").addEventListener("click", () => {
      download("flowspace-plan.md", planMarkdown(data), "text/markdown;charset=utf-8");
    });

    $("csv").addEventListener("click", () => {
      const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const rows = [
        ["Task", "Priority", "Duration (minutes)", "Note"],
        ...tasks.map(task => [
          task.title,
          priorityOf(task),
          durationOf(task),
          task.note
        ])
      ];

      download(
        "flowspace-plan.csv",
        rows.map(row => row.map(quote).join(",")).join("\r\n"),
        "text/csv;charset=utf-8"
      );
    });

    $("ics").addEventListener("click", () => {
      const escapeICS = (value) => String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
        .replace(/\n/g, "\\n");

      const events = tasks.filter(task =>
        task.date &&
        /^\d{4}-\d{2}-\d{2}$/.test(task.date) &&
        task.start &&
        /^\d{1,2}:\d{2}$/.test(task.start)
      );

      if (!events.length) {
        showError("No tasks have both a date and a start time. The other exports are still available.");
        return;
      }

      const pad = number => String(number).padStart(2, "0");
      const stamp = date =>
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

      const calendarEvents = events.map(task => {
        const [year, month, day] = task.date.split("-").map(Number);
        const [hour, minute] = task.start.split(":").map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + durationOf(task) * 60000);

        return [
          "BEGIN:VEVENT",
          `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@flowspaceai`,
          `DTSTART:${stamp(start)}`,
          `DTEND:${stamp(end)}`,
          `SUMMARY:${escapeICS(task.title)}`,
          `DESCRIPTION:${escapeICS(task.note)}`,
          "END:VEVENT"
        ].join("\r\n");
      });

      download(
        "flowspace-plan.ics",
        ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FlowSpaceAI//EN",
          ...calendarEvents, "END:VCALENDAR"].join("\r\n"),
        "text/calendar;charset=utf-8"
      );
    });

    $("print").addEventListener("click", () => window.print());

    $("toReflect").addEventListener("click", () => {
      setMode("reflect");
      $("userText").value = `I made a plan with these tasks: ${tasks.map(t => t.title).join(", ")}. Help me reflect on how I feel about it.`;
      count();
      $("userText").focus();
    });
  }

  function renderReflect(data) {
    if (data.crisis) {
      $("resultContent").innerHTML = `
        <section class="reflect-card reflect-pink">
          <span class="visual-eyebrow">SUPPORT MATTERS</span>
          <h2>You don't have to face this alone.</h2>
          <p>${escapeHTML(data.message || "Please reach out to someone you trust or local emergency services if you are in immediate danger.")}</p>
          ${(data.helplines || []).map(line => `
            <div class="reflect-detail-card">
              <h3>${escapeHTML(line.name)}</h3>
              <p>${escapeHTML(line.contact)}</p>
            </div>
          `).join("")}
        </section>
        ${transcriptHTML(data)}
      `;
      return;
    }

    const feelings = Array.isArray(data.feelings)
      ? data.feelings
      : [];

    const cards = [
      {
        color: "reflect-pink",
        icon: "♡",
        title: "What I hear",
        text: data.reflection
      },
      {
        color: "reflect-blue",
        icon: "✦",
        title: "A gentle reframe",
        text: data.reframe
      },
      {
        color: "reflect-green",
        icon: "🌱",
        title: "One small next step",
        text: data.next_step
      }
    ].filter(card => card.text);

    $("resultContent").innerHTML = `
      <div class="results-header">
        <div>
          <span class="visual-eyebrow">A MOMENT FOR YOU</span>
          <h2>Thank you for sharing 💗</h2>
          <p>Take what feels helpful and leave the rest.</p>
        </div>
        <button type="button" class="export-button" id="copyReflect">Copy reflection</button>
      </div>

      ${transcriptHTML(data)}

      ${feelings.length ? `
        <section class="feelings-panel">
          <span class="visual-eyebrow">FEELINGS I HEARD</span>
          <div class="feelings-chips">
            ${feelings.map((feeling, index) => `
              <span class="feeling-chip ${colors[index % colors.length]}">${escapeHTML(feeling)}</span>
            `).join("")}
          </div>
        </section>
      ` : ""}

      <div class="reflect-card-grid">
        ${cards.map((card, index) => `
          <article class="reflect-card ${card.color}">
            <div class="reflect-card-icon">${card.icon}</div>
            <span class="reflect-card-number">0${index + 1}</span>
            <h3>${escapeHTML(card.title)}</h3>
            <p>${escapeHTML(card.text)}</p>
          </article>
        `).join("")}
      </div>

      <div class="gentle-note">♡ You don't need to solve everything right now. One small step is enough.</div>

      <button type="button" class="export-button" id="turnPlan">✦ Turn this into a plan</button>
    `;

    $("copyReflect").addEventListener("click", () => {
      copyText(cards.map(card => `${card.title}\n${card.text}`).join("\n\n"));
    });

    $("turnPlan").addEventListener("click", () => {
      const text = data.transcript || data.reflection || "";
      setMode("plan");
      $("userText").value = text;
      count();
      $("userText").focus();
    });
  }

  // Voice recording.
  function clearAudio() {
    audioBlob = null;
    $("audioPreview").classList.add("hidden");
    $("audioUpload").value = "";
    $("recordLabel").textContent = "Record voice";
    $("voiceStatus").textContent = "Up to 90 seconds";
    $("record").classList.remove("recording", "is-recording");
  }

  $("removeAudio").addEventListener("click", clearAudio);

  $("record").addEventListener("click", async () => {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      $("audioUpload").click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find(type => MediaRecorder.isTypeSupported(type));

      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const chunks = [];
      recordingSeconds = 0;

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingTimer);

        audioBlob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm"
        });

        if (audioBlob.size > 4 * 1024 * 1024) {
          clearAudio();
          showError("The recording is too large. Please record a shorter note.");
          return;
        }

        $("audioName").textContent = `Voice note ready (${recordingSeconds}s)`;
        $("audioPreview").classList.remove("hidden");
        $("recordLabel").textContent = "Record again";
        $("record").classList.remove("recording", "is-recording");
        $("voiceStatus").textContent = "Ready to submit";
      };

      recorder.start();
      $("record").classList.add("recording");
      $("recordLabel").textContent = "Stop recording";

      recordingTimer = setInterval(() => {
        recordingSeconds++;
        $("voiceStatus").textContent = `Recording... ${recordingSeconds}s / 90s`;

        if (recordingSeconds >= 90 && recorder.state === "recording") {
          recorder.stop();
        }
      }, 1000);
    } catch {
      $("voiceStatus").textContent = "Microphone unavailable. Upload audio instead.";
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

  // Submit to the existing Flask API.
  $("form").addEventListener("submit", async event => {
    event.preventDefault();
    $("error").classList.add("hidden");

    const text = $("userText").value.trim();

    if (!text && !audioBlob) {
      showError("Please type something or record a voice note first.");
      return;
    }

    const formData = new FormData();
    formData.append("text", text);
    formData.append(
      "timezone",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    );

    if (audioBlob) {
      const extension = audioBlob.type.includes("wav") ? "wav"
        : audioBlob.type.includes("mp4") ? "m4a"
        : audioBlob.type.includes("mpeg") ? "mp3"
        : audioBlob.type.includes("ogg") ? "ogg"
        : "webm";

      formData.append("audio", audioBlob, `voice-note.${extension}`);
    }

    $("submit").disabled = true;
    $("submitText").textContent = "Working...";
    $("empty").classList.add("hidden");
    $("resultContent").classList.add("hidden");
    $("loading").classList.remove("hidden");

    try {
      const response = await fetch(
        mode === "plan" ? "/api/plan" : "/api/reflect",
        { method: "POST", body: formData }
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
      showError(error.message || "Could not reach the server. Please try again.");
    } finally {
      $("submit").disabled = false;
      $("submitText").textContent = mode === "plan"
        ? "Build my plan"
        : "Reflect with me";
    }
  });

  $("welcomeScreen").classList.remove("hidden");
  $("appScreen").classList.add("hidden");
  count();
})();
