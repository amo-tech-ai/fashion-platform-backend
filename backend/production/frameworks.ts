// This file contains the logic for generating event frameworks.

export function getPlanFramework(
  eventType: string,
  attendeeCount: number,
  budget: number,
  timelineDays: number
) {
  switch (eventType) {
    case 'designer_showcase':
      return getDesignerShowcaseFramework(attendeeCount, budget, timelineDays);
    case 'fashion_networking':
      return getFashionNetworkingFramework(attendeeCount, budget, timelineDays);
    case 'product_launch':
      return getProductLaunchFramework(attendeeCount, budget, timelineDays);
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
}

function getDesignerShowcaseFramework(attendeeCount: number, budget: number, timelineDays: number) {
  return {
    venueRequirements: {
      type: 'Gallery/Showroom',
      sqft: attendeeCount * 15,
      features: ['Runway capability', 'Backstage area', 'Good lighting'],
    },
    staffingPlan: {
      roles: ['Event Coordinator', 'Logistics Manager', 'Creative Director', 'Venue Manager'],
      count: 4,
    },
    vendorRequirements: {
      catering: 'Mid-tier cocktails & canapés',
      av: 'Professional runway lighting and sound',
      photography: 'Runway and backstage coverage',
    },
    budgetAllocations: [
      { category: 'Venue & Space', percentage: 30, allocatedAmount: budget * 0.3 },
      { category: 'Talent & Models', percentage: 20, allocatedAmount: budget * 0.2 },
      { category: 'Production (AV, Catering)', percentage: 20, allocatedAmount: budget * 0.2 },
      { category: 'Marketing & Media', percentage: 15, allocatedAmount: budget * 0.15 },
      { category: 'Operations & Staff', percentage: 10, allocatedAmount: budget * 0.1 },
      { category: 'Contingency', percentage: 5, allocatedAmount: budget * 0.05 },
    ],
    timelineMilestones: [
      { name: 'Finalize Scope', dueInDays: 2, assignedTo: 'Event Coordinator', description: 'Confirm all event parameters.' },
      { name: 'Book Venue', dueInDays: 7, assignedTo: 'Venue Manager', description: 'Sign contract with selected venue.' },
      { name: 'Confirm Designers', dueInDays: 10, assignedTo: 'Creative Director', description: 'Finalize list of participating designers.' },
      { name: 'Model Casting', dueInDays: 14, assignedTo: 'Creative Director', description: 'Complete model casting calls.' },
      { name: 'Launch Marketing', dueInDays: 15, assignedTo: 'Event Coordinator', description: 'Begin marketing and media outreach.' },
      { name: 'Final Vendor Contracts', dueInDays: 21, assignedTo: 'Logistics Coordinator', description: 'Sign all remaining vendor contracts.' },
      { name: 'Final Fittings', dueInDays: timelineDays - 5, assignedTo: 'Creative Director', description: 'Complete final model fittings.' },
      { name: 'Event Day', dueInDays: timelineDays, assignedTo: 'All', description: 'Execute the fashion show.' },
    ],
    stakeholders: [
      { role: 'Event Coordinator', responsibilities: 'Overall orchestration' },
      { role: 'Venue Manager', responsibilities: 'Space and technicals' },
      { role: 'Logistics Coordinator', responsibilities: 'Vendors and operations' },
      { role: 'Creative Director', responsibilities: 'Designers and show flow' },
    ],
    successCriteria: {
      timelineAdherence: '95%',
      budgetVariance: '< 8%',
      attendanceRate: '85%',
      mediaCoverage: '5+ outlets',
    },
  };
}

function getFashionNetworkingFramework(attendeeCount: number, budget: number, timelineDays: number) {
  // Simplified for brevity
  return getDesignerShowcaseFramework(attendeeCount, budget, timelineDays); 
}

function getProductLaunchFramework(attendeeCount: number, budget: number, timelineDays: number) {
  // Simplified for brevity
  return getDesignerShowcaseFramework(attendeeCount, budget, timelineDays);
}
