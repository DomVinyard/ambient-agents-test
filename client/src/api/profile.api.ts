export interface BlendProfileRequest {
  category: string;
  newInsights: any[];
  existingContent: string | null;
  userInfo: any;
}

export interface CompileProfileRequest {
  profileFiles: Record<string, string>;
  userInfo: any;
}

export interface AnalyzeAutomationRequest {
  profileFiles: Record<string, string>;
  userInfo: any;
}

/**
 * Blend new insights with existing profile content
 */
export const blendProfile = async (request: BlendProfileRequest): Promise<{ content: string }> => {
  const response = await fetch(`${import.meta.env.VITE_SERVER_URI}/api/profile/blend-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to blend profile: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Compile multiple profile files into a comprehensive profile
 */
export const compileProfile = async (request: CompileProfileRequest): Promise<{ content: string }> => {
  const response = await fetch(`${import.meta.env.VITE_SERVER_URI}/api/profile/compile-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to compile profile: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Analyze automation opportunities from profile files
 */
export const analyzeAutomation = async (request: AnalyzeAutomationRequest): Promise<{ summary: string; automations: any[] }> => {
  const response = await fetch(`${import.meta.env.VITE_SERVER_URI}/api/profile/analyze-automation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze automation: ${response.statusText}`);
  }

  return response.json();
}; 