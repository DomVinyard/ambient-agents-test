import { ZepClient } from '@getzep/zep-cloud';
import { GraphDataType } from '@getzep/zep-cloud/api';

interface GraphEdge {
  fact: string;
  name?: string;
  createdAt?: string;
}

// Define the UserProfile interface with all the nested attributes
interface UserProfile {
  demographics: {
    fullName: string;
    age: string;
    gender: string;
    currentLocation: string;
    homeOwnership: string;
    neighborhoodType: string;
    previousLocations: string;
    commutingPattern: string;
    regionalAffiliation: string;
    travelFrequency: string;
    incomeLevel: string;
    wealthIndicators: string;
    financialConcerns: string;
    socialClass: string;
    spendingHabits: string;
    highestDegree: string;
    educationalInstitutions: string;
    fieldOfStudy: string;
    continuingEducation: string;
    certifications: string;
    languageProficiency: string;
    vocabularyLevel: string;
    analyticalThinking: string;
    technicalProficiency: string;
    decisionMakingStyle: string;
    informationProcessing: string;
    learningStyle: string;
    problemSolvingApproach: string;
    politicalLeanings: string;
    politicalEngagement: string;
    policyInterests: string;
    socialViews: string;
    economicViews: string;
    newsConsumption: string;
    valueSystem: string;
    personalityTraits: string;
    communicationStyle: string;
    riskTolerance: string;
    changeAdaptability: string;
    socialBehavior: string;
    stressResponses: string;
  };
  professionalProfile: {
    currentRole: string;
    employer: string;
    industryCategory: string;
    careerLength: string;
    careerTrajectory: string;
    previousRoles: string;
    companySize: string;
    companyStage: string;
    workplaceType: string;
    teamStructure: string;
    organizationalLevel: string;
    decisionAuthority: string;
    expertiseAreas: string;
    technicalSkills: string;
    softSkills: string;
    industryKnowledge: string;
    toolProficiency: string;
    domainChallenges: string;
    primaryResponsibilities: string;
    collaborationPattern: string;
    meetingInvolvement: string;
    decisionInvolvement: string;
    communicationVolume: string;
    workloadPattern: string;
    careerAspirations: string;
    skillDevelopment: string;
    mentorshipStatus: string;
    professionalNetworks: string;
    industryInvolvement: string;
    learningPriorities: string;
    painPoints: string;
    productivityBarriers: string;
    informationGaps: string;
    timeConstraints: string;
    workflowObstacles: string;
    collaborationFrictions: string;
  };
  relationships: {
    maritalStatus: string;
    partnerName: string;
    childrenInfo: string;
    extendedFamily: string;
    closeContacts: string;
    professionalNetwork: string;
    communityConnections: string;
    socialCircles: string;
    relationshipDynamics: string;
    communicationFrequency: string;
  };
  communicationPatterns: {
    emailVolume: string;
    responseSpeed: string;
    communicationTone: string;
    preferredPlatforms: string;
    messagingHabits: string;
    formalityLevel: string;
    communicationSchedule: string;
  };
  timeManagement: {
    workSchedule: string;
    peakProductivity: string;
    timeAllocation: string;
    planningApproach: string;
    deadlineHandling: string;
    procrastinationTendencies: string;
    timeTrackingMethods: string;
  };
  digitalBehavior: {
    deviceUsage: string;
    softwarePreferences: string;
    digitalOrganization: string;
    onlinePresence: string;
    techAdoption: string;
    dataManagement: string;
    digitalSkills: string;
  };
  interests: {
    professionalInterests: string;
    personalHobbies: string;
    mediaPreferences: string;
    learningTopics: string;
    readingHabits: string;
    leisureActivities: string;
    travelInterests: string;
  };
  lifestyle: {
    dailyRoutine: string;
    healthHabits: string;
    wellnessPriorities: string;
    workLifeBalance: string;
    consumptionPatterns: string;
    socialActivities: string;
    lifeStage: string;
  };
  automationOpportunities: {
    repetitiveCorrespondence: string;
    informationRequests: string;
    manualDataEntry: string;
    followUpNeeds: string;
    schedulingPatterns: string;
    resourceCoordination: string;
    approvalProcesses: string;
    informationSorting: string;
    documentGeneration: string;
    statusReporting: string;
    dataConsolidation: string;
    reminderSystems: string;
  };
}

export class ZepService {
  private client: ZepClient;

  constructor() {
    const ZEP_API_KEY = process.env.ZEP_API_KEY;
    if (!ZEP_API_KEY) {
      throw new Error('ZEP_API_KEY is not set in environment variables');
    }
    this.client = new ZepClient({
      apiKey: ZEP_API_KEY,
    });
  }

  async deleteUser(sessionId: string) {
    await this.client.user.delete(sessionId);
  }

  async addUser(sessionId: string, email: string, firstName: string, lastName: string) {
    await this.client.user.add({
      userId: sessionId,
      email,
      firstName,
      lastName
    });
  }

  async addBatchInferences(sessionId: string, inferences: any[], sourceDescription: string, created_at: string) {
    if (Array.isArray(inferences) && inferences.length > 0) {
      const episodes = inferences.map((inference) => ({
        data: inference,
        type: GraphDataType.Text,
        sourceDescription,
        created_at
      }));
      await this.client.graph.addBatch({ episodes, userId: sessionId });
    }
  }

  async getSessionMessages(sessionId: string, limit: number = 100) {
    return await this.client.memory.getSessionMessages(sessionId, { limit });
  }

  async searchGraph(query: string, userId: string, limit: number = 20) {
    const results = await this.client.graph.search({
      query,
      userId,
      limit,
      reranker: 'rrf'
    });
    
    // console.log({results: JSON.stringify(results)});
    
    return results;
  }

  async getEpisodesByUserId(userId: string, lastn: number = 100) {
    return await this.client.graph.episode.getByUserId(userId, { lastn });
  }

  async getUser(userId: string) {
    return await this.client.user.get(userId);
  }

  // Helper method to search for a single user attribute
  async searchUserAttribute(userId: string, attribute: string, query: string): Promise<string> {
    try {
      const results = await this.searchGraph(query, userId, 5);
      const findings = results.edges?.map((edge: GraphEdge) => edge.fact) || [];
      
      return findings.length > 0 ? findings.join(". ") : "";
    } catch (error) {
      console.error(`Error searching for ${attribute}:`, error);
      return "";
    }
  }

  // Helper to set a nested property using a path string
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  // Build a comprehensive user profile from parallel searches
  async buildUserProfile(userId: string): Promise<UserProfile> {
    console.log(`Building comprehensive user profile for: ${userId}`);
    const searchPromises = [];
    
    // Define all attribute searches
    const searches = [
      // Demographics
      { path: "demographics.fullName", query: "What is the user's full name" },
      { path: "demographics.age", query: "Find information indicating the user's age or date of birth" },
      { path: "demographics.gender", query: "What is the user's gender" },
      { path: "demographics.currentLocation", query: "Where does the user currently live - city, state, country" },
      { path: "demographics.homeOwnership", query: "Does the user own or rent their home" },
      { path: "demographics.neighborhoodType", query: "What type of neighborhood does the user live in - urban, suburban, rural" },
      { path: "demographics.previousLocations", query: "Where has the user lived previously" },
      { path: "demographics.commutingPattern", query: "How does the user commute to work" },
      { path: "demographics.regionalAffiliation", query: "What regions or places does the user feel connected to" },
      { path: "demographics.travelFrequency", query: "How often does the user travel" },
      { path: "demographics.incomeLevel", query: "What is the user's income level or salary range" },
      { path: "demographics.wealthIndicators", query: "Find mentions of assets, investments, or major purchases" },
      { path: "demographics.financialConcerns", query: "What financial concerns or priorities does the user have" },
      { path: "demographics.socialClass", query: "What social class does the user belong to or identify with" },
      { path: "demographics.spendingHabits", query: "What are the user's spending patterns or preferences" },
      { path: "demographics.highestDegree", query: "What is the user's highest educational degree" },
      { path: "demographics.educationalInstitutions", query: "What schools, colleges, or universities has the user attended" },
      { path: "demographics.fieldOfStudy", query: "What did the user study or major in" },
      { path: "demographics.continuingEducation", query: "Is the user engaged in any ongoing learning or professional development" },
      { path: "demographics.certifications", query: "What professional certifications or credentials does the user have" },
      { path: "demographics.languageProficiency", query: "What languages does the user speak and at what proficiency" },
      { path: "demographics.vocabularyLevel", query: "Assess the user's vocabulary range and complexity" },
      { path: "demographics.analyticalThinking", query: "How analytical is the user in their reasoning" },
      { path: "demographics.technicalProficiency", query: "How technically proficient is the user" },
      { path: "demographics.decisionMakingStyle", query: "Is the user more deliberative or intuitive in making decisions" },
      { path: "demographics.informationProcessing", query: "Does the user prefer detailed or big-picture information" },
      { path: "demographics.learningStyle", query: "How does the user prefer to learn new information" },
      { path: "demographics.problemSolvingApproach", query: "How does the user approach solving complex problems" },
      { path: "demographics.politicalLeanings", query: "What are the user's political leanings or orientation" },
      { path: "demographics.politicalEngagement", query: "How politically engaged or active is the user" },
      { path: "demographics.policyInterests", query: "What political issues does the user express interest in" },
      { path: "demographics.socialViews", query: "What are the user's views on social issues" },
      { path: "demographics.economicViews", query: "What are the user's views on economic issues" },
      { path: "demographics.newsConsumption", query: "What news sources or information channels does the user follow" },
      { path: "demographics.valueSystem", query: "What core values guide the user's worldview" },
      { path: "demographics.personalityTraits", query: "What personality traits does the user exhibit" },
      { path: "demographics.communicationStyle", query: "What is the user's typical communication style and tone" },
      { path: "demographics.riskTolerance", query: "How willing is the user to take risks" },
      { path: "demographics.changeAdaptability", query: "How does the user respond to change or uncertainty" },
      { path: "demographics.socialBehavior", query: "Is the user more introverted or extroverted" },
      { path: "demographics.stressResponses", query: "How does the user typically respond to stress or pressure" },
      
      // Professional Profile
      { path: "professionalProfile.currentRole", query: "What is the user's current job title or position" },
      { path: "professionalProfile.employer", query: "Who is the user's current employer or company" },
      { path: "professionalProfile.industryCategory", query: "What specific industry or sector does the user work in" },
      { path: "professionalProfile.careerLength", query: "How many years of professional experience does the user have" },
      { path: "professionalProfile.careerTrajectory", query: "What has been the user's career progression pattern" },
      { path: "professionalProfile.previousRoles", query: "What previous positions or roles has the user held" },
      { path: "professionalProfile.companySize", query: "What size company does the user work for - startup, SMB, enterprise" },
      { path: "professionalProfile.companyStage", query: "What stage is the user's company - early, growth, mature" },
      { path: "professionalProfile.workplaceType", query: "Does the user work in office, hybrid, or remote" },
      { path: "professionalProfile.teamStructure", query: "What is the user's team size and reporting structure" },
      { path: "professionalProfile.organizationalLevel", query: "What is the user's level in the organizational hierarchy" },
      { path: "professionalProfile.decisionAuthority", query: "What decision-making authority does the user have" },
      { path: "professionalProfile.expertiseAreas", query: "What are the user's specific domains of professional expertise" },
      { path: "professionalProfile.technicalSkills", query: "What technical skills does the user possess" },
      { path: "professionalProfile.softSkills", query: "What interpersonal or management skills does the user have" },
      { path: "professionalProfile.industryKnowledge", query: "How deep is the user's industry-specific knowledge" },
      { path: "professionalProfile.toolProficiency", query: "What tools or software is the user proficient in" },
      { path: "professionalProfile.domainChallenges", query: "What domain-specific challenges does the user face" },
      { path: "professionalProfile.primaryResponsibilities", query: "What are the user's main job responsibilities" },
      { path: "professionalProfile.collaborationPattern", query: "How does the user collaborate with others at work" },
      { path: "professionalProfile.meetingInvolvement", query: "What types of meetings does the user attend" },
      { path: "professionalProfile.decisionInvolvement", query: "What types of decisions is the user involved in" },
      { path: "professionalProfile.communicationVolume", query: "What is the volume of the user's professional communications" },
      { path: "professionalProfile.workloadPattern", query: "What are the patterns in the user's workload distribution" },
      { path: "professionalProfile.careerAspirations", query: "What are the user's career goals or aspirations" },
      { path: "professionalProfile.skillDevelopment", query: "What skills is the user actively developing" },
      { path: "professionalProfile.mentorshipStatus", query: "Is the user a mentor or being mentored" },
      { path: "professionalProfile.professionalNetworks", query: "What professional groups or networks is the user part of" },
      { path: "professionalProfile.industryInvolvement", query: "How involved is the user in industry events or communities" },
      { path: "professionalProfile.learningPriorities", query: "What are the user's professional learning priorities" },
      { path: "professionalProfile.painPoints", query: "What specific frustrations or challenges does the user face at work" },
      { path: "professionalProfile.productivityBarriers", query: "What productivity blockers does the user encounter" },
      { path: "professionalProfile.informationGaps", query: "What information or resource gaps does the user experience" },
      { path: "professionalProfile.timeConstraints", query: "What time pressures or constraints does the user face" },
      { path: "professionalProfile.workflowObstacles", query: "What workflow inefficiencies does the user encounter" },
      { path: "professionalProfile.collaborationFrictions", query: "What challenges in team collaboration does the user face" },
      
      // Relationships
      { path: "relationships.maritalStatus", query: "What is the user's marital status" },
      { path: "relationships.partnerName", query: "What is the name of the user's spouse or partner" },
      { path: "relationships.childrenInfo", query: "Does the user have children and what are their ages" },
      { path: "relationships.extendedFamily", query: "Who are the user's extended family members" },
      { path: "relationships.closeContacts", query: "Who are the people the user communicates with most frequently" },
      { path: "relationships.professionalNetwork", query: "Who are the user's key professional contacts" },
      { path: "relationships.communityConnections", query: "What community groups is the user connected to" },
      { path: "relationships.socialCircles", query: "What social groups or circles does the user belong to" },
      { path: "relationships.relationshipDynamics", query: "How does the user interact with different relationship types" },
      { path: "relationships.communicationFrequency", query: "How frequently does the user communicate with different contacts" },
      
      // Communication Patterns
      { path: "communicationPatterns.emailVolume", query: "What is the user's typical email volume" },
      { path: "communicationPatterns.responseSpeed", query: "How quickly does the user typically respond to communications" },
      { path: "communicationPatterns.communicationTone", query: "What tone does the user use in communications" },
      { path: "communicationPatterns.preferredPlatforms", query: "What communication platforms does the user prefer" },
      { path: "communicationPatterns.messagingHabits", query: "What are the user's messaging habits and patterns" },
      { path: "communicationPatterns.formalityLevel", query: "How formal or informal is the user in communications" },
      { path: "communicationPatterns.communicationSchedule", query: "When does the user typically communicate" },
      
      // Time Management
      { path: "timeManagement.workSchedule", query: "What is the user's typical work schedule" },
      { path: "timeManagement.peakProductivity", query: "When is the user most productive during the day" },
      { path: "timeManagement.timeAllocation", query: "How does the user allocate time across different activities" },
      { path: "timeManagement.planningApproach", query: "How does the user approach planning and scheduling" },
      { path: "timeManagement.deadlineHandling", query: "How does the user handle deadlines" },
      { path: "timeManagement.procrastinationTendencies", query: "Does the user tend to procrastinate" },
      { path: "timeManagement.timeTrackingMethods", query: "How does the user track and manage their time" },
      
      // Digital Behavior
      { path: "digitalBehavior.deviceUsage", query: "What devices does the user primarily use" },
      { path: "digitalBehavior.softwarePreferences", query: "What software or applications does the user prefer" },
      { path: "digitalBehavior.digitalOrganization", query: "How does the user organize digital information" },
      { path: "digitalBehavior.onlinePresence", query: "What is the user's online presence or activity" },
      { path: "digitalBehavior.techAdoption", query: "How quickly does the user adopt new technology" },
      { path: "digitalBehavior.dataManagement", query: "How does the user manage personal and professional data" },
      { path: "digitalBehavior.digitalSkills", query: "What digital skills does the user possess" },
      
      // Interests
      { path: "interests.professionalInterests", query: "What professional topics interest the user" },
      { path: "interests.personalHobbies", query: "What hobbies or personal interests does the user have" },
      { path: "interests.mediaPreferences", query: "What media does the user prefer to consume" },
      { path: "interests.learningTopics", query: "What topics does the user enjoy learning about" },
      { path: "interests.readingHabits", query: "What are the user's reading habits and preferences" },
      { path: "interests.leisureActivities", query: "What leisure activities does the user engage in" },
      { path: "interests.travelInterests", query: "What are the user's travel interests or preferences" },
      
      // Lifestyle
      { path: "lifestyle.dailyRoutine", query: "What is the user's typical daily routine" },
      { path: "lifestyle.healthHabits", query: "What are the user's health habits" },
      { path: "lifestyle.wellnessPriorities", query: "What wellness priorities does the user have" },
      { path: "lifestyle.workLifeBalance", query: "How does the user balance work and personal life" },
      { path: "lifestyle.consumptionPatterns", query: "What are the user's consumption patterns or preferences" },
      { path: "lifestyle.socialActivities", query: "What social activities does the user engage in" },
      { path: "lifestyle.lifeStage", query: "What life stage is the user in" },
      
      // Automation Opportunities
      { path: "automationOpportunities.repetitiveCorrespondence", query: "What repetitive correspondence does the user engage in" },
      { path: "automationOpportunities.informationRequests", query: "What information requests does the user frequently receive" },
      { path: "automationOpportunities.manualDataEntry", query: "What manual data entry tasks does the user perform" },
      { path: "automationOpportunities.followUpNeeds", query: "What follow-up communications does the user need to manage" },
      { path: "automationOpportunities.schedulingPatterns", query: "What scheduling activities does the user regularly perform" },
      { path: "automationOpportunities.resourceCoordination", query: "How does the user coordinate people or resources" },
      { path: "automationOpportunities.approvalProcesses", query: "What approval workflows does the user participate in" },
      { path: "automationOpportunities.informationSorting", query: "How does the user sort or filter information manually" },
      { path: "automationOpportunities.documentGeneration", query: "What documents does the user regularly create" },
      { path: "automationOpportunities.statusReporting", query: "What status reporting does the user regularly do" },
      { path: "automationOpportunities.dataConsolidation", query: "How does the user consolidate data from different sources" },
      { path: "automationOpportunities.reminderSystems", query: "What reminder systems does the user need" }
    ];
    
    // Create all promises
    for (const search of searches) {
      const promise = this.searchUserAttribute(userId, search.path, search.query)
        .then(result => ({ path: search.path, result }));
      searchPromises.push(promise);
    }
    
    // Run all searches in parallel
    console.log(`Running ${searchPromises.length} parallel searches for user profile`);
    const results = await Promise.all(searchPromises);
    
    // Build the profile object
    const profile = {} as UserProfile;
    
    console.log("***** STARTING EMAIL PHRASE FILTERING *****");
    
    // Process a few sample attributes for testing with extensive logging
    const sampleAttributes = [
      "demographics.fullName", 
      "lifestyle.dailyRoutine",
      "automationOpportunities.repetitiveCorrespondence"
    ];
    
    for (const { path, result } of results) {
      if (result) {
        const isLoggingSample = sampleAttributes.includes(path);
        
        if (isLoggingSample) {
          console.log(`\n\n===== PROCESSING ATTRIBUTE: ${path} =====`);
          console.log("INPUT:", result);
        }
        
        // Split the text into sentences
        const sentences = result.split('. ');
        
        if (isLoggingSample) {
          console.log(`\nSPLIT INTO ${sentences.length} SENTENCES:`);
          sentences.forEach((s, i) => console.log(`  ${i}: "${s}"`));
        }
        
        // Define specific template sentences to filter out
        const templateSentences = [
          "User i@dom.vin uses a personalized email address at the custom domain \"dom.vin\"",
          "User i@dom.vin's display name appears as \"Dom Vinyard\" in the email recipient field, indicating that this is the name they use for personal correspondence",
          "User i@dom.vin uses a Gmail address for email"
        ];
        
        // Define key phrases that indicate a template sentence (for more flexible matching)
        const templatePhrases = [
          "indicating that this is the name they use for personal correspondence",
          "uses a personalized email address at the custom domain",
          "uses a Gmail address for email"
        ];
        
        // Filter out template sentences
        const filteredSentences = sentences.filter(sentence => {
          // Clean up the sentence for comparison (removing trailing periods, quotes, etc.)
          const cleanSentence = sentence.replace(/\.+$/, '').trim();
          
          // First, check for exact template matches
          for (const template of templateSentences) {
            if (cleanSentence === template) {
              if (isLoggingSample) {
                console.log(`\nFILTERED OUT EXACT TEMPLATE: "${sentence}"`);
              }
              return false;
            }
          }
          
          // Second, check for key phrases that indicate a template sentence
          for (const phrase of templatePhrases) {
            if (cleanSentence.includes(phrase)) {
              if (isLoggingSample) {
                console.log(`\nFILTERED OUT BY PHRASE: "${sentence}" - contains "${phrase}"`);
              }
              return false;
            }
          }
          
          return true;
        });
        
        if (isLoggingSample) {
          console.log(`\nAFTER FILTERING: ${filteredSentences.length} SENTENCES REMAIN`);
          filteredSentences.forEach((s, i) => console.log(`  ${i}: "${s}"`));
        }
        
        // Join the remaining sentences
        const cleanedResult = filteredSentences.join('. ');
        
        // Fix any trailing/leading periods and format
        const formattedResult = cleanedResult
          .replace(/^\.\s*/, '') // Remove leading periods
          .replace(/\.{2,}/g, '.') // Replace multiple periods with single one
          .replace(/\s\./g, '.') // Fix space before period
          .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single one
          .trim();
        
        // Add a period at the end if needed
        const finalResult = formattedResult.endsWith('.') ? formattedResult : formattedResult + '.';
        
        if (isLoggingSample) {
          console.log(`\nFINAL RESULT: "${finalResult}"`);
        }
        
        this.setNestedProperty(profile, path, finalResult);
      }
    }
    
    console.log(`Completed building user profile with ${results.filter(r => r.result).length} attributes found`);
    
    return profile;
  }

  // Legacy method kept for backward compatibility
  async gatherUserContext(userId: string): Promise<any> {
    console.log("Using legacy gatherUserContext - consider using buildUserProfile instead");
    const userProfile = await this.buildUserProfile(userId);
    
    // Convert to the old format for backward compatibility
    return {
      patterns: [userProfile.demographics?.personalityTraits || "", userProfile.demographics?.communicationStyle || ""].filter(Boolean),
      relationships: [userProfile.relationships?.maritalStatus || "", userProfile.relationships?.partnerName || "", userProfile.relationships?.childrenInfo || ""].filter(Boolean),
      workContext: [userProfile.professionalProfile?.currentRole || "", userProfile.professionalProfile?.employer || "", userProfile.professionalProfile?.industryCategory || ""].filter(Boolean),
      communicationPatterns: [userProfile.communicationPatterns?.emailVolume || "", userProfile.communicationPatterns?.responseSpeed || ""].filter(Boolean),
      schedulingPatterns: [userProfile.timeManagement?.workSchedule || "", userProfile.timeManagement?.timeAllocation || ""].filter(Boolean),
      projectContext: [userProfile.professionalProfile?.primaryResponsibilities || "", userProfile.professionalProfile?.collaborationPattern || ""].filter(Boolean),
      informationManagement: [userProfile.digitalBehavior?.digitalOrganization || "", userProfile.digitalBehavior?.dataManagement || ""].filter(Boolean),
      decisionPatterns: [userProfile.demographics?.decisionMakingStyle || "", userProfile.professionalProfile?.decisionInvolvement || ""].filter(Boolean),
      collaborationPatterns: [userProfile.professionalProfile?.collaborationPattern || "", userProfile.relationships?.professionalNetwork || ""].filter(Boolean),
      automationOpportunities: [
        userProfile.automationOpportunities?.repetitiveCorrespondence || "",
        userProfile.automationOpportunities?.informationRequests || "",
        userProfile.automationOpportunities?.manualDataEntry || "",
        userProfile.automationOpportunities?.followUpNeeds || "",
        userProfile.automationOpportunities?.schedulingPatterns || ""
      ].filter(Boolean)
    };
  }
}