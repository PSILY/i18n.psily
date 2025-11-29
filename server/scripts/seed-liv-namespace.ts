import { storage } from "../storage";

const LIV_NAMESPACE = "liv-psilyou";

const englishTranslations = [
  // Topics
  { key: "topics.grief.name", text: "Grief & Loss" },
  { key: "topics.grief.description", text: "Understanding and navigating the journey through grief" },
  { key: "topics.memorial.name", text: "Memorial Planning" },
  { key: "topics.memorial.description", text: "Creating meaningful tributes and remembrance" },
  { key: "topics.funeral.name", text: "Funeral Arrangements" },
  { key: "topics.funeral.description", text: "Planning dignified farewell ceremonies" },
  { key: "topics.will.name", text: "Will & Testament" },
  { key: "topics.will.description", text: "Documenting your wishes for the future" },
  { key: "topics.digital_legacy.name", text: "Digital Legacy" },
  { key: "topics.digital_legacy.description", text: "Managing online presence and digital assets" },
  { key: "topics.end_of_life.name", text: "End of Life Care" },
  { key: "topics.end_of_life.description", text: "Making informed decisions about care preferences" },
  { key: "topics.organ_donation.name", text: "Organ Donation" },
  { key: "topics.organ_donation.description", text: "Understanding and registering donation wishes" },
  { key: "topics.financial_planning.name", text: "Financial Planning" },
  { key: "topics.financial_planning.description", text: "Organizing finances and inheritance" },
  { key: "topics.life_insurance.name", text: "Life Insurance" },
  { key: "topics.life_insurance.description", text: "Protecting your loved ones financially" },
  { key: "topics.power_of_attorney.name", text: "Power of Attorney" },
  { key: "topics.power_of_attorney.description", text: "Designating trusted decision-makers" },
  { key: "topics.healthcare_directive.name", text: "Healthcare Directive" },
  { key: "topics.healthcare_directive.description", text: "Documenting medical care preferences" },
  { key: "topics.family_communication.name", text: "Family Communication" },
  { key: "topics.family_communication.description", text: "Having meaningful conversations with loved ones" },
  { key: "topics.personal_legacy.name", text: "Personal Legacy" },
  { key: "topics.personal_legacy.description", text: "Sharing your story and values" },
  { key: "topics.pet_care.name", text: "Pet Care Planning" },
  { key: "topics.pet_care.description", text: "Ensuring your pets are cared for" },
  { key: "topics.burial_cremation.name", text: "Burial & Cremation" },
  { key: "topics.burial_cremation.description", text: "Choosing final resting arrangements" },
  
  // Chat UI
  { key: "chat.title", text: "Chat with LIV" },
  { key: "chat.subtitle", text: "Your compassionate guide through life's important conversations" },
  { key: "chat.placeholder", text: "Type your message..." },
  { key: "chat.send", text: "Send" },
  { key: "chat.thinking", text: "LIV is thinking..." },
  { key: "chat.error", text: "Something went wrong. Please try again." },
  { key: "chat.welcome", text: "Hello! I'm LIV, here to guide you through important life planning conversations at your own pace." },
  { key: "chat.continue", text: "Continue Conversation" },
  { key: "chat.new_topic", text: "Start New Topic" },
  
  // Common UI
  { key: "common.save", text: "Save" },
  { key: "common.cancel", text: "Cancel" },
  { key: "common.continue", text: "Continue" },
  { key: "common.back", text: "Back" },
  { key: "common.next", text: "Next" },
  { key: "common.skip", text: "Skip" },
  { key: "common.done", text: "Done" },
  { key: "common.close", text: "Close" },
  { key: "common.loading", text: "Loading..." },
  { key: "common.error", text: "An error occurred" },
  { key: "common.retry", text: "Try Again" },
  { key: "common.yes", text: "Yes" },
  { key: "common.no", text: "No" },
  { key: "common.learn_more", text: "Learn More" },
  { key: "common.get_started", text: "Get Started" },
  
  // Navigation
  { key: "navigation.topics", text: "Topics" },
  { key: "navigation.progress", text: "My Progress" },
  { key: "navigation.profile", text: "Profile" },
  { key: "navigation.settings", text: "Settings" },
  { key: "navigation.help", text: "Help" },
  
  // Progress
  { key: "progress.completed", text: "Completed" },
  { key: "progress.in_progress", text: "In Progress" },
  { key: "progress.not_started", text: "Not Started" },
  { key: "progress.topics_explored", text: "Topics Explored" },
  { key: "progress.conversations", text: "Conversations" },
  { key: "progress.time_spent", text: "Time Spent" },
  
  // Questions
  { key: "questions.what_matters", text: "What matters most to you about this topic?" },
  { key: "questions.any_concerns", text: "Do you have any concerns or worries?" },
  { key: "questions.next_steps", text: "What would you like to do next?" },
  { key: "questions.need_help", text: "Would you like help with this?" },
  { key: "questions.ready_continue", text: "Are you ready to continue?" },
  
  // Emotions/Support
  { key: "emotions.understood", text: "I understand this can be difficult" },
  { key: "emotions.take_time", text: "Take all the time you need" },
  { key: "emotions.here_for_you", text: "I'm here whenever you're ready" },
  { key: "emotions.no_pressure", text: "There's no pressure to decide now" },
  { key: "emotions.well_done", text: "Well done for taking this step" },
  
  // Prompts
  { key: "prompts.explore_topic", text: "Would you like to explore this topic?" },
  { key: "prompts.share_thoughts", text: "Feel free to share your thoughts" },
  { key: "prompts.ask_questions", text: "Ask me anything you'd like to know" },
  { key: "prompts.save_progress", text: "Your progress has been saved" },
  
  // Accessibility
  { key: "accessibility.screen_reader_chat", text: "Chat conversation with LIV assistant" },
  { key: "accessibility.new_message", text: "New message received" },
  { key: "accessibility.send_message", text: "Send message button" },
  
  // Errors
  { key: "error.connection", text: "Connection error. Please check your internet." },
  { key: "error.session_expired", text: "Your session has expired. Please log in again." },
  { key: "error.server", text: "Server error. Please try again later." },
];

async function seedLivNamespace() {
  console.log(`\n🌱 Seeding ${LIV_NAMESPACE} namespace with ${englishTranslations.length} English translations...\n`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const t of englishTranslations) {
    try {
      // Check if translation already exists
      const existing = await storage.getTranslation(t.key, "en", LIV_NAMESPACE);
      
      if (existing) {
        console.log(`⏭️  Skipped (exists): ${t.key}`);
        skipped++;
        continue;
      }

      await storage.createTranslationWithoutCompletion({
        key: t.key,
        locale: "en",
        namespace: LIV_NAMESPACE,
        text: t.text,
        reviewed: true, // English is the source, so mark as reviewed
      });
      
      console.log(`✅ Created: ${t.key}`);
      created++;
    } catch (error: any) {
      console.error(`❌ Error creating ${t.key}: ${error.message}`);
      errors++;
    }
  }

  // Update completion for English
  await storage.updateLanguageNamespaceCompletion("en", LIV_NAMESPACE);

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n✨ Done! Now run AI translation for other languages.\n`);
}

seedLivNamespace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
