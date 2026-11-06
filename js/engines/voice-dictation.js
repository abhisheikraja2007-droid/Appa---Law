export const DEFAULT_SNIPPETS = {
  "/verify": "Verified at {place} on this {date} that the contents of paras 1 to {n} of the above petition are true and correct to the best of my knowledge, information, and belief, and no material facts have been suppressed.",
  "/prayer": "It is therefore most humbly prayed that this Hon’ble Court may be pleased to grant the relief as prayed for herein, and pass such further order or orders as this Hon’ble Court may deem fit and proper in the interest of justice.",
  "/affidavit": "I do hereby solemnly affirm and state on oath that what is stated in the accompanying petition is true to my personal knowledge, belief, and information, and I believe the same to be true.",
  "/bail": "That the petitioner is an innocent, law-abiding citizen with deep roots in society, has no bad antecedents, and undertakes to abide by any stringent condition that this Hon’ble Court may impose, including not tampering with witnesses or absconding.",
  "/inj": "That the petitioner has established a strong prima facie case, the balance of convenience lies entirely in favour of granting interim protection, and the petitioner will suffer irreparable loss and hardship if an ad-interim injunction is not granted."
};

let recognitionInstance = null;
let isRecording = false;

export function isSpeechSupported() {
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
}

export function startDictation({ lang = "en-IN", onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (onError) onError(new Error("Speech recognition is not supported in this browser."));
    return null;
  }

  if (recognitionInstance && isRecording) {
    recognitionInstance.stop();
  }

  recognitionInstance = new SpeechRecognition();
  recognitionInstance.continuous = true;
  recognitionInstance.interimResults = true;
  recognitionInstance.lang = lang;

  recognitionInstance.onstart = () => {
    isRecording = true;
  };

  recognitionInstance.onresult = event => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    if (onResult) onResult({ final, interim });
  };

  recognitionInstance.onerror = event => {
    if (onError) onError(event.error);
  };

  recognitionInstance.onend = () => {
    isRecording = false;
    if (onEnd) onEnd();
  };

  recognitionInstance.start();
  return recognitionInstance;
}

export function stopDictation() {
  if (recognitionInstance && isRecording) {
    recognitionInstance.stop();
    isRecording = false;
  }
}

export function expandSnippets(text, context = {}) {
  let output = text;
  for (const [key, template] of Object.entries(DEFAULT_SNIPPETS)) {
    if (output.includes(key)) {
      const expanded = template
        .replace(/{place}/g, context.place || "Chennai")
        .replace(/{date}/g, context.date || new Date().toLocaleDateString("en-GB"))
        .replace(/{n}/g, context.n || "10");
      output = output.replaceAll(key, expanded);
    }
  }
  return output;
}

