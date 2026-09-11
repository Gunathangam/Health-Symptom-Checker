/**
 * Agentic AI Health Symptom Checker — Frontend App
 * Standalone mode: runs entirely in the browser, no backend required.
 * When IBM Granite credentials are available, switch STANDALONE to false
 * and point API_BASE to your Express server.
 */

// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  STANDALONE: true,                    // true = in-browser demo, false = call backend
  API_BASE: "http://localhost:3000",   // only used when STANDALONE = false
};

// ─── DOM References ──────────────────────────────────────────────────────────
const DOM = {
  symptomInput:   document.getElementById("symptomInput"),
  languageSelect: document.getElementById("languageSelect"),
  ageInput:       document.getElementById("ageInput"),
  genderSelect:   document.getElementById("genderSelect"),
  analyzeBtn:     document.getElementById("analyzeBtn"),
  btnText:        document.getElementById("btnText"),
  btnSpinner:     document.getElementById("btnSpinner"),
  resultsPanel:   document.getElementById("resultsPanel"),
  emptyCard:      document.getElementById("emptyResultsCard"),
  errorBox:       document.getElementById("errorBox"),
  errorMsg:       document.getElementById("errorMsg"),
  charCount:      document.getElementById("charCount"),
  urgencyBanner:  document.getElementById("urgencyBanner"),
  conditionsList: document.getElementById("conditionsList"),
  remediesList:   document.getElementById("remediesList"),
  doctorList:     document.getElementById("doctorList"),
  preventionList: document.getElementById("preventionList"),
  disclaimer:     document.getElementById("disclaimerText"),
  sourcesChips:   document.getElementById("sourcesChips"),
  detectedLang:   document.getElementById("detectedLang"),
  historyList:    document.getElementById("historyList"),
  historyEmpty:   document.getElementById("historyEmpty"),
};

// ─── Session History ─────────────────────────────────────────────────────────
let searchHistory = JSON.parse(sessionStorage.getItem("sym_history") || "[]");

// ─── Character Counter ────────────────────────────────────────────────────────
DOM.symptomInput.addEventListener("input", () => {
  const len = DOM.symptomInput.value.length;
  DOM.charCount.textContent = `${len} / 500`;
  DOM.charCount.style.color = len > 450 ? "#da1e28" : "#8d8d8d";
});

// ─── Quick Symptom Tag Click ──────────────────────────────────────────────────
document.querySelectorAll(".symptom-tag").forEach((tag) => {
  tag.addEventListener("click", () => {
    const current = DOM.symptomInput.value.trim();
    const tagText = tag.dataset.symptom;
    DOM.symptomInput.value = current ? `${current}, ${tagText}` : tagText;
    DOM.symptomInput.dispatchEvent(new Event("input"));
    DOM.symptomInput.focus();
  });
});

// ─── Analyze Button ───────────────────────────────────────────────────────────
DOM.analyzeBtn.addEventListener("click", analyzeSymptoms);
DOM.symptomInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) analyzeSymptoms();
});

async function analyzeSymptoms() {
  const symptoms = DOM.symptomInput.value.trim();
  if (!symptoms || symptoms.length < 3) {
    showError("Please describe your symptoms (at least 3 characters).");
    return;
  }
  setLoading(true);
  hideError();
  hideResults();

  try {
    let data;
    if (CONFIG.STANDALONE) {
      data = await standaloneAnalyze(symptoms);
    } else {
      const response = await fetch(`${CONFIG.API_BASE}/api/symptoms/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms,
          language: DOM.languageSelect.value || undefined,
          age:      DOM.ageInput.value || undefined,
          gender:   DOM.genderSelect.value || undefined,
        }),
      });
      data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Analysis failed.");
    }
    renderResults(data);
    addToHistory(symptoms, data.analysis?.urgencyLevel || "Unknown");
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STANDALONE ENGINE  — full in-browser symptom analysis (no server needed)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Symptom knowledge base — maps keyword patterns to conditions & care advice.
 * Each entry: { patterns, conditions, urgency, urgencyReason, remedies,
 *               whenToSeeDoctor, prevention, sources }
 */
const KNOWLEDGE_BASE = [
  {
    patterns: /chest pain|chest tightness|heart attack|left arm pain|jaw pain/i,
    conditions: [
      { name: "Acute Coronary Syndrome (Heart Attack)", description: "A sudden blockage of blood flow to the heart muscle. This is a medical emergency requiring immediate care.", matchScore: "High" },
      { name: "Angina Pectoris", description: "Chest pain caused by reduced blood flow to the heart, often triggered by exertion or stress.", matchScore: "Medium" },
      { name: "Pulmonary Embolism", description: "A blood clot in the lungs causing sudden chest pain and shortness of breath.", matchScore: "Low" },
    ],
    urgency: "Emergency",
    urgencyReason: "Chest pain can indicate a life-threatening cardiac event. Call emergency services (911/112) immediately.",
    remedies: ["Do NOT delay — call emergency services immediately.", "Sit or lie down in a comfortable position.", "If prescribed, take nitroglycerin as directed.", "Chew an aspirin (325 mg) if not allergic and advised by a doctor.", "Stay calm and loosen tight clothing."],
    whenToSeeDoctor: ["Go to the emergency room immediately.", "Do not drive yourself — call an ambulance.", "Chest pain lasting more than a few minutes is always an emergency.", "Pain spreading to arm, neck, jaw, or back.", "Associated sweating, nausea, or shortness of breath."],
    prevention: ["Maintain a heart-healthy diet low in saturated fats.", "Exercise regularly (150+ minutes of moderate activity per week).", "Quit smoking and limit alcohol intake.", "Monitor and control blood pressure and cholesterol.", "Manage stress through mindfulness or relaxation techniques."],
    sources: ["WHO Cardiovascular Diseases", "American Heart Association", "CDC Heart Disease"],
  },
  {
    patterns: /shortness of breath|difficulty breathing|cannot breathe|breathless|wheezing/i,
    conditions: [
      { name: "Asthma Attack", description: "Sudden narrowing of the airways causing wheezing, coughing, and difficulty breathing.", matchScore: "High" },
      { name: "Chronic Obstructive Pulmonary Disease (COPD)", description: "A chronic lung disease causing obstructed airflow from the lungs.", matchScore: "Medium" },
      { name: "Pneumonia", description: "Infection that inflames the air sacs in one or both lungs, which may fill with fluid.", matchScore: "Medium" },
    ],
    urgency: "Emergency",
    urgencyReason: "Severe difficulty breathing requires immediate medical attention.",
    remedies: ["Use a prescribed inhaler if available.", "Sit upright and stay calm.", "Remove yourself from any known triggers (dust, smoke).", "Pursed-lip breathing can help slow breathing.", "Warm steam inhalation may provide mild relief."],
    whenToSeeDoctor: ["Go to the emergency room if breathing becomes severely difficult.", "Lips or fingernails turning blue (cyanosis).", "Inability to speak full sentences due to breathlessness.", "No relief after using rescue inhaler.", "Sudden onset with no prior history."],
    prevention: ["Avoid known triggers such as smoke, dust, and allergens.", "Get annual flu and pneumonia vaccines.", "Use air purifiers in living spaces.", "Follow prescribed controller medication regimens.", "Practice breathing exercises like diaphragmatic breathing."],
    sources: ["WHO Asthma Fact Sheet", "American Lung Association", "GINA Guidelines"],
  },
  {
    patterns: /fever|high temperature|chills|sweating|hot/i,
    conditions: [
      { name: "Influenza (Flu)", description: "A contagious viral respiratory illness causing fever, body aches, and fatigue. Usually resolves in 1–2 weeks.", matchScore: "High" },
      { name: "COVID-19", description: "Viral respiratory illness caused by SARS-CoV-2, ranging from mild to severe symptoms.", matchScore: "High" },
      { name: "Bacterial Infection / Sepsis (if very high fever)", description: "A serious bacterial infection requiring prompt medical evaluation, especially with fever above 39.4°C (103°F).", matchScore: "Medium" },
    ],
    urgency: "Moderate",
    urgencyReason: "Fever is usually manageable at home but should be monitored closely. Seek care if temperature exceeds 39.4°C (103°F) or lasts more than 3 days.",
    remedies: ["Take paracetamol (acetaminophen) or ibuprofen to reduce fever.", "Stay well-hydrated with water, electrolyte drinks, or broths.", "Rest as much as possible.", "Apply a cool, damp cloth to forehead and wrists.", "Wear lightweight, breathable clothing."],
    whenToSeeDoctor: ["Fever above 39.4°C (103°F) in adults.", "Fever lasting more than 3 days despite medication.", "Stiff neck, severe headache, or rash alongside fever.", "Confusion, difficulty breathing, or extreme weakness.", "Febrile seizures in children — seek emergency care immediately."],
    prevention: ["Get annual influenza vaccination.", "Wash hands thoroughly and frequently.", "Avoid close contact with infected individuals.", "Stay up-to-date with COVID-19 boosters.", "Maintain good ventilation in living spaces."],
    sources: ["WHO Influenza Fact Sheet", "CDC Flu Information", "NHS Fever Guide"],
  },
  {
    patterns: /sore throat|throat pain|painful swallowing|tonsil/i,
    conditions: [
      { name: "Viral Pharyngitis (Common Cold)", description: "Inflammation of the throat caused by viral infection. Very common and usually self-limiting within 7–10 days.", matchScore: "High" },
      { name: "Streptococcal Pharyngitis (Strep Throat)", description: "A bacterial throat infection requiring antibiotic treatment. Confirmed by rapid strep test.", matchScore: "Medium" },
      { name: "Tonsillitis", description: "Inflammation of the tonsils, causing swelling, pain, and difficulty swallowing.", matchScore: "Medium" },
    ],
    urgency: "Low",
    urgencyReason: "Most sore throats are viral and resolve on their own within a week. Monitor for strep symptoms.",
    remedies: ["Gargle warm salt water (½ tsp in 8 oz water) several times daily.", "Drink warm honey and lemon tea to soothe the throat.", "Use throat lozenges or sprays for temporary relief.", "Take OTC pain relievers (ibuprofen or paracetamol).", "Stay well-hydrated and rest your voice."],
    whenToSeeDoctor: ["Sore throat lasting more than 7 days.", "High fever (above 38.5°C / 101.3°F) with throat pain.", "Difficulty swallowing saliva or opening mouth.", "White patches or pus on tonsils.", "Swollen lymph nodes that are very tender."],
    prevention: ["Wash hands regularly, especially before eating.", "Avoid sharing drinks, utensils, or lip products.", "Stay away from people with known strep throat.", "Keep throat moist with adequate hydration.", "Use a humidifier during dry seasons."],
    sources: ["CDC Sore Throat Information", "NHS Throat Infections", "MedlinePlus"],
  },
  {
    patterns: /headache|head pain|migraine|head pressure|throbbing head/i,
    conditions: [
      { name: "Tension Headache", description: "The most common type of headache, causing a dull, aching pain and pressure around the forehead.", matchScore: "High" },
      { name: "Migraine", description: "A recurring, intense headache often on one side of the head, sometimes with nausea and light sensitivity.", matchScore: "Medium" },
      { name: "Cluster Headache", description: "Severe, burning pain around one eye in cyclical patterns. Less common but very intense.", matchScore: "Low" },
    ],
    urgency: "Low",
    urgencyReason: "Most headaches are benign and manageable at home. Seek immediate care for sudden severe 'thunderclap' headaches.",
    remedies: ["Rest in a quiet, dark room away from screens.", "Apply a cold or warm compress to the forehead or neck.", "Take OTC analgesics (ibuprofen, paracetamol) at the first sign.", "Stay hydrated — dehydration is a common trigger.", "Practice relaxation techniques: deep breathing or meditation."],
    whenToSeeDoctor: ["Sudden, extremely severe 'thunderclap' headache — may indicate brain bleed.", "Headache with stiff neck, fever, or rash.", "Headache following a head injury.", "Progressive headache that worsens over days.", "Headache with vision changes, confusion, or weakness."],
    prevention: ["Maintain consistent sleep schedules.", "Stay hydrated (8+ glasses of water daily).", "Identify and avoid personal headache triggers (caffeine, stress, screens).", "Take regular breaks from screen time (20-20-20 rule).", "Manage stress with regular exercise and relaxation."],
    sources: ["WHO Headache Disorders", "American Migraine Foundation", "NHS Headache Guide"],
  },
  {
    patterns: /cough|cold|runny nose|stuffy nose|congestion|sneezing|nasal/i,
    conditions: [
      { name: "Common Cold (Rhinovirus)", description: "A mild viral upper respiratory infection causing runny nose, sneezing, and congestion. Self-limiting in 7–10 days.", matchScore: "High" },
      { name: "Seasonal Allergic Rhinitis (Hay Fever)", description: "An immune response to pollen, dust, or pet dander causing nasal symptoms without fever.", matchScore: "Medium" },
      { name: "Sinusitis", description: "Inflammation of the sinuses causing congestion, facial pressure, and thick nasal discharge.", matchScore: "Medium" },
    ],
    urgency: "Low",
    urgencyReason: "Cold and congestion symptoms are typically mild and self-resolving. No urgent care needed unless symptoms worsen.",
    remedies: ["Use saline nasal sprays or rinses (neti pot) to clear congestion.", "Inhale steam from a bowl of hot water (cover head with towel).", "Stay hydrated with warm fluids — soups and herbal teas.", "Use a cool-mist humidifier in your room.", "OTC decongestants or antihistamines may provide relief."],
    whenToSeeDoctor: ["Symptoms lasting more than 10 days without improvement.", "Thick yellow or green nasal discharge with facial pain.", "High fever alongside nasal symptoms.", "Significant facial swelling or pain around the eyes.", "Symptoms severely affecting sleep or daily activities."],
    prevention: ["Wash hands frequently for 20+ seconds.", "Avoid touching eyes, nose, and mouth with unwashed hands.", "Use allergy-proof pillowcases and wash bedding weekly.", "Keep windows closed during high pollen seasons.", "Strengthen immunity through regular exercise and balanced nutrition."],
    sources: ["CDC Common Cold", "ACAAI Allergic Rhinitis", "NHS Sinusitis"],
  },
  {
    patterns: /stomach|nausea|vomit|diarrhea|abdominal|belly|gut|gastro|food poison/i,
    conditions: [
      { name: "Gastroenteritis (Stomach Flu)", description: "Viral or bacterial infection of the digestive tract causing nausea, vomiting, and diarrhea.", matchScore: "High" },
      { name: "Food Poisoning", description: "Illness from contaminated food causing rapid-onset nausea, vomiting, and diarrhea within hours.", matchScore: "High" },
      { name: "Irritable Bowel Syndrome (IBS)", description: "A chronic functional gut disorder causing cramping, bloating, and altered bowel habits.", matchScore: "Medium" },
    ],
    urgency: "Moderate",
    urgencyReason: "Monitor for dehydration — the main complication of vomiting and diarrhea. Seek care if unable to keep fluids down.",
    remedies: ["Sip clear fluids frequently — water, oral rehydration solution (ORS), or diluted juice.", "Follow the BRAT diet (Bananas, Rice, Applesauce, Toast) when eating resumes.", "Avoid dairy, fatty, spicy, or high-fibre foods until recovered.", "Rest and avoid strenuous activity.", "Ginger tea or ginger chews may help reduce nausea."],
    whenToSeeDoctor: ["Signs of dehydration: no urination for 8+ hours, extreme thirst, dizziness.", "Vomiting or diarrhea lasting more than 48 hours.", "Blood in vomit or stool.", "Severe abdominal pain or cramping.", "Fever above 38.5°C (101.3°F) with stomach symptoms."],
    prevention: ["Wash hands before preparing or eating food.", "Cook meat and seafood to safe internal temperatures.", "Refrigerate leftovers within 2 hours.", "Avoid consuming unpasteurised dairy or untreated water.", "Practice good kitchen hygiene — clean surfaces and utensils regularly."],
    sources: ["WHO Food Safety", "CDC Foodborne Illness", "NHS Gastroenteritis"],
  },
  {
    patterns: /rash|skin|itch|hive|eczema|redness|blister|sore skin|dermatitis/i,
    conditions: [
      { name: "Contact Dermatitis", description: "Skin inflammation caused by contact with an allergen or irritant, causing redness and itching.", matchScore: "High" },
      { name: "Urticaria (Hives)", description: "Raised, itchy welts on the skin, often triggered by allergic reaction, stress, or infection.", matchScore: "High" },
      { name: "Eczema (Atopic Dermatitis)", description: "A chronic skin condition causing dry, itchy, and inflamed patches of skin.", matchScore: "Medium" },
    ],
    urgency: "Low",
    urgencyReason: "Most skin rashes are not dangerous. Seek urgent care if rash spreads rapidly or is accompanied by facial swelling or breathing difficulty.",
    remedies: ["Apply a cool, damp cloth to reduce itching and inflammation.", "Use over-the-counter hydrocortisone cream for mild rashes.", "Take oral antihistamines (e.g., cetirizine) for allergic reactions.", "Moisturise regularly with fragrance-free lotion.", "Avoid scratching — keep nails short and wear cotton gloves at night if needed."],
    whenToSeeDoctor: ["Rash accompanied by difficulty breathing or facial swelling (anaphylaxis — emergency).", "Rapidly spreading rash with fever.", "Rash that forms blisters or open sores.", "Rash in an infant under 3 months.", "No improvement after 1 week of home treatment."],
    prevention: ["Identify and avoid known skin allergens.", "Use gentle, fragrance-free soaps and detergents.", "Moisturise skin daily, especially after bathing.", "Wear breathable, natural fabrics (cotton).", "Patch-test new cosmetics or topical products before full use."],
    sources: ["American Academy of Dermatology", "NHS Skin Rashes", "MedlinePlus Dermatitis"],
  },
  {
    patterns: /fatigue|tired|exhausted|weak|no energy|lethargy|sleepy all day/i,
    conditions: [
      { name: "Viral Illness / Post-viral Fatigue", description: "Persistent tiredness following a viral infection such as flu or COVID-19, which can last weeks.", matchScore: "High" },
      { name: "Anaemia (Iron Deficiency)", description: "Low red blood cell count reducing oxygen delivery to the body, causing fatigue and weakness.", matchScore: "Medium" },
      { name: "Hypothyroidism (Underactive Thyroid)", description: "Insufficient thyroid hormone production causing fatigue, weight gain, and cold sensitivity.", matchScore: "Medium" },
    ],
    urgency: "Low",
    urgencyReason: "Fatigue alone is rarely an emergency. A persistent pattern warrants a blood test and GP evaluation.",
    remedies: ["Prioritise 7–9 hours of quality sleep each night.", "Take short rest breaks during the day rather than extended naps.", "Eat a balanced diet rich in iron, B12, and vitamin D.", "Engage in light exercise such as short walks to boost energy.", "Limit caffeine and alcohol, especially in the evening."],
    whenToSeeDoctor: ["Fatigue lasting more than 2 weeks with no clear cause.", "Accompanied by unexplained weight loss or gain.", "Severe fatigue preventing daily activities.", "Alongside shortness of breath or chest pains.", "With signs of depression or persistent low mood."],
    prevention: ["Maintain a consistent sleep-wake cycle.", "Stay active with regular moderate exercise.", "Eat nutritious, balanced meals — avoid skipping meals.", "Stay hydrated throughout the day.", "Manage stress proactively with mindfulness or therapy."],
    sources: ["NHS Tiredness and Fatigue", "CDC Sleep and Health", "MedlinePlus Fatigue"],
  },
  {
    patterns: /back pain|lower back|spine|lumbar|back ache/i,
    conditions: [
      { name: "Muscle Strain (Lower Back)", description: "Overstretching or tearing of muscles or ligaments in the back, the most common cause of back pain.", matchScore: "High" },
      { name: "Herniated Disc", description: "Spinal disc material pressing on nearby nerves, causing local and sometimes radiating pain.", matchScore: "Medium" },
      { name: "Sciatica", description: "Irritation of the sciatic nerve causing sharp pain radiating from the lower back down the leg.", matchScore: "Medium" },
    ],
    urgency: "Low",
    urgencyReason: "Most back pain resolves within a few weeks with rest and simple pain management. Seek care for numbness or loss of bladder/bowel control.",
    remedies: ["Apply ice packs for first 48 hours, then switch to heat.", "Take OTC anti-inflammatory pain relievers (ibuprofen) as directed.", "Gentle stretching and light movement are better than complete bed rest.", "Maintain good posture when sitting — use a lumbar support cushion.", "Sleep on a medium-firm mattress in a foetal position or on your back with a pillow under the knees."],
    whenToSeeDoctor: ["Pain radiating down the leg below the knee (possible sciatica).", "Numbness or tingling in legs, groin, or buttocks.", "Bladder or bowel control changes — seek emergency care.", "Back pain following a significant fall or trauma.", "Unexplained weight loss with back pain — possible systemic cause."],
    prevention: ["Strengthen core muscles with targeted exercises.", "Practice proper lifting technique (bend at the knees, not the waist).", "Maintain a healthy weight to reduce spinal load.", "Avoid prolonged sitting — stand and stretch every 30–60 minutes.", "Sleep on a supportive mattress."],
    sources: ["WHO Musculoskeletal Conditions", "NHS Back Pain Guide", "American Academy of Orthopaedic Surgeons"],
  },
];

/** Default / fallback response when no specific pattern matches */
function defaultAnalysis(symptoms) {
  return {
    possibleConditions: [
      { name: "General Systemic Illness", description: "A combination of symptoms that may indicate a viral or bacterial illness. Consult a healthcare provider for accurate evaluation.", matchScore: "Medium" },
      { name: "Stress-Related Somatic Symptoms", description: "Physical symptoms driven or worsened by psychological stress, anxiety, or fatigue.", matchScore: "Low" },
    ],
    urgencyLevel: "Low",
    urgencyReason: "Symptoms appear non-specific. Monitor closely and consult a doctor if they persist beyond 5–7 days.",
    homeRemedies: [
      "Rest adequately and avoid overexertion.",
      "Stay well-hydrated (8–10 glasses of water daily).",
      "Eat light, nutritious meals to support recovery.",
      "Monitor your temperature and note any new symptoms.",
      "Avoid self-medicating without professional guidance.",
    ],
    whenToSeeDoctor: [
      "Symptoms persist beyond 7 days or worsen progressively.",
      "New symptoms develop alongside current ones.",
      "High fever (above 39°C / 102°F) develops.",
      "You feel significantly unwell or unable to perform daily tasks.",
      "Any symptom that concerns you — always trust your instincts.",
    ],
    preventiveTips: [
      "Wash hands regularly with soap and water.",
      "Maintain a balanced diet rich in vitamins and minerals.",
      "Get regular physical activity and adequate sleep.",
      "Stay up-to-date with recommended vaccinations.",
      "Schedule regular health check-ups with your doctor.",
    ],
    disclaimer: "This information is for educational purposes only and is NOT a medical diagnosis. Always consult a qualified healthcare professional for personal health advice.",
    sources: ["WHO General Health Guidelines", "CDC Healthy Living", "NHS Live Well", "MedlinePlus"],
  };
}

/**
 * Core standalone analysis — matches symptoms against the knowledge base.
 * Returns a full structured analysis object.
 */
async function standaloneAnalyze(symptoms) {
  // Simulate a slight processing delay for realism
  await new Promise((r) => setTimeout(r, 900));

  const lang = DOM.languageSelect.value || "English";
  let matched = null;
  let highestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    const m = symptoms.match(entry.patterns);
    if (m) {
      const score = m.length;
      if (score > highestScore) {
        highestScore = score;
        matched = entry;
      }
    }
  }

  const analysis = matched
    ? {
        possibleConditions: matched.conditions,
        urgencyLevel: matched.urgency,
        urgencyReason: matched.urgencyReason,
        homeRemedies: matched.remedies,
        whenToSeeDoctor: matched.whenToSeeDoctor,
        preventiveTips: matched.prevention,
        disclaimer:
          "This information is for educational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider.",
        sources: matched.sources,
      }
    : defaultAnalysis(symptoms);

  return {
    success: true,
    language: lang,
    symptoms,
    analysis,
    timestamp: new Date().toISOString(),
    poweredBy: "Standalone Demo — Connect IBM Granite for AI-powered analysis",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RENDER RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

function renderResults(data) {
  const a = data.analysis || {};

  // Hide empty state card
  if (DOM.emptyCard) DOM.emptyCard.style.display = "none";

  // Detected language label
  if (DOM.detectedLang && data.language) {
    DOM.detectedLang.textContent = `Language: ${data.language}  ·  ${data.poweredBy}`;
    DOM.detectedLang.classList.remove("hidden");
  }

  renderUrgency(a.urgencyLevel, a.urgencyReason);
  renderConditions(a.possibleConditions || []);
  renderList(DOM.remediesList,   a.homeRemedies     || []);
  renderList(DOM.doctorList,     a.whenToSeeDoctor  || []);
  renderList(DOM.preventionList, a.preventiveTips   || []);

  if (DOM.disclaimer) DOM.disclaimer.textContent = a.disclaimer || "";
  renderSources(a.sources || []);

  DOM.resultsPanel.classList.add("visible");
  setTimeout(() => DOM.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
}

function renderUrgency(level, reason) {
  const maps = {
    Emergency: { cls: "urgency-emergency", icon: "🚨" },
    Urgent:    { cls: "urgency-urgent",    icon: "⚠️"  },
    Moderate:  { cls: "urgency-moderate",  icon: "🟡" },
    Low:       { cls: "urgency-low",       icon: "✅" },
    Unknown:   { cls: "urgency-unknown",   icon: "ℹ️"  },
  };
  const cfg = maps[level] || maps.Unknown;
  DOM.urgencyBanner.className = `urgency-banner ${cfg.cls}`;
  DOM.urgencyBanner.innerHTML = `
    <div class="ub-icon">${cfg.icon}</div>
    <div>
      <div class="ub-label">Urgency Level</div>
      <div class="ub-level">${level || "Unknown"}</div>
      <div class="ub-reason">${escHtml(reason || "")}</div>
    </div>`;
}

function renderConditions(conditions) {
  if (!conditions.length) {
    DOM.conditionsList.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem">No specific conditions identified.</p>`;
    return;
  }
  DOM.conditionsList.innerHTML = conditions.map((c) => `
    <div class="condition-card">
      <div style="flex:1">
        <div class="condition-name">${escHtml(c.name || "")}</div>
        <div class="condition-desc">${escHtml(c.description || "")}</div>
      </div>
      <span class="match-badge match-${c.matchScore || "Low"}">${c.matchScore || "Low"}</span>
    </div>`).join("");
}

function renderList(el, items) {
  if (!el) return;
  if (!items.length) { el.innerHTML = `<li>No specific information available.</li>`; return; }
  el.innerHTML = items.map((i) => `<li>${escHtml(i)}</li>`).join("");
}

function renderSources(sources) {
  if (!DOM.sourcesChips) return;
  DOM.sourcesChips.innerHTML = sources.map((s) => `<span class="source-chip">📚 ${escHtml(s)}</span>`).join("");
}

// ─── History ──────────────────────────────────────────────────────────────────
function addToHistory(symptoms, urgency) {
  const entry = {
    symptoms: symptoms.substring(0, 80) + (symptoms.length > 80 ? "…" : ""),
    urgency,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  searchHistory.unshift(entry);
  if (searchHistory.length > 10) searchHistory.pop();
  sessionStorage.setItem("sym_history", JSON.stringify(searchHistory));
  renderHistory();
}

function renderHistory() {
  if (!searchHistory.length) {
    DOM.historyList.classList.add("hidden");
    DOM.historyEmpty.classList.remove("hidden");
    return;
  }
  DOM.historyEmpty.classList.add("hidden");
  DOM.historyList.classList.remove("hidden");
  DOM.historyList.innerHTML = searchHistory.map((h, i) => `
    <div class="history-item" data-index="${i}">
      <div class="h-time">${h.time} · Urgency: <strong>${h.urgency}</strong></div>
      <div class="h-symptom">${escHtml(h.symptoms)}</div>
    </div>`).join("");
  DOM.historyList.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", () => {
      const entry = searchHistory[parseInt(el.dataset.index, 10)];
      if (entry) {
        DOM.symptomInput.value = entry.symptoms;
        DOM.symptomInput.dispatchEvent(new Event("input"));
        DOM.symptomInput.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function setLoading(loading) {
  DOM.analyzeBtn.disabled = loading;
  DOM.btnText.textContent  = loading ? "Analyzing…" : "🔍 Analyze Symptoms";
  DOM.btnSpinner.style.display = loading ? "block" : "none";
}

function showError(msg) {
  DOM.errorMsg.textContent = msg;
  DOM.errorBox.classList.add("visible");
}

function hideError()   { DOM.errorBox.classList.remove("visible"); }
function hideResults() { DOM.resultsPanel.classList.remove("visible"); }

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Init ─────────────────────────────────────────────────────────────────────
renderHistory();
