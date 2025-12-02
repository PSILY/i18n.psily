import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const translations = [
  // English buttons
  { key: "buttons.yes", locale: "en", namespace: "liv-psilyou", text: "Yes", reviewed: true },
  { key: "buttons.no", locale: "en", namespace: "liv-psilyou", text: "No", reviewed: true },
  { key: "buttons.confirm", locale: "en", namespace: "liv-psilyou", text: "Yes, that's correct", reviewed: true },
  { key: "buttons.reject", locale: "en", namespace: "liv-psilyou", text: "No, that's wrong", reviewed: true },
  { key: "buttons.elaborate", locale: "en", namespace: "liv-psilyou", text: "Let me elaborate", reviewed: true },
  { key: "buttons.back_to_topics", locale: "en", namespace: "liv-psilyou", text: "Back to topics", reviewed: true },
  // Danish buttons
  { key: "buttons.yes", locale: "da", namespace: "liv-psilyou", text: "Ja", reviewed: true },
  { key: "buttons.no", locale: "da", namespace: "liv-psilyou", text: "Nej", reviewed: true },
  { key: "buttons.confirm", locale: "da", namespace: "liv-psilyou", text: "Ja, det er rigtigt", reviewed: true },
  { key: "buttons.reject", locale: "da", namespace: "liv-psilyou", text: "Nej, det er forkert", reviewed: true },
  { key: "buttons.elaborate", locale: "da", namespace: "liv-psilyou", text: "Lad mig uddybe", reviewed: true },
  { key: "buttons.back_to_topics", locale: "da", namespace: "liv-psilyou", text: "Tilbage til emner", reviewed: true },
  // English messages
  { key: "messages.confirm_response", locale: "en", namespace: "liv-psilyou", text: "Yes, that's correct", reviewed: true },
  { key: "messages.reject_response", locale: "en", namespace: "liv-psilyou", text: "No, that's not quite right", reviewed: true },
  { key: "messages.elaborate_response", locale: "en", namespace: "liv-psilyou", text: "I would like to elaborate...", reviewed: true },
  { key: "messages.answer_saved", locale: "en", namespace: "liv-psilyou", text: "Answer saved", reviewed: true },
  { key: "messages.error_try_again", locale: "en", namespace: "liv-psilyou", text: "Error - try again", reviewed: true },
  // Danish messages
  { key: "messages.confirm_response", locale: "da", namespace: "liv-psilyou", text: "Ja, det er korrekt", reviewed: true },
  { key: "messages.reject_response", locale: "da", namespace: "liv-psilyou", text: "Nej, det er ikke helt rigtigt", reviewed: true },
  { key: "messages.elaborate_response", locale: "da", namespace: "liv-psilyou", text: "Jeg vil gerne uddybe mit svar...", reviewed: true },
  { key: "messages.answer_saved", locale: "da", namespace: "liv-psilyou", text: "Svar gemt", reviewed: true },
  { key: "messages.error_try_again", locale: "da", namespace: "liv-psilyou", text: "Fejl - prøv igen", reviewed: true },
];

async function addTranslations() {
  console.log(`Adding ${translations.length} translations to liv-psilyou namespace...`);
  
  for (const translation of translations) {
    const { error } = await supabase
      .from("translations")
      .upsert(translation, { onConflict: "key,locale,namespace" });
    
    if (error) {
      console.error(`Failed to add ${translation.key} (${translation.locale}):`, error.message);
    } else {
      console.log(`Added: ${translation.key} (${translation.locale})`);
    }
  }
  
  console.log("Done!");
}

addTranslations();
