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
      features: ['Runway capability', 'Backstage area', 'Good lighting', 'AV mounting points'],
    },
    attendeeMix: {
      'Industry Professionals': 0.6,
      'Media': 0.3,
      'VIPs': 0.1,
    },
    staffingPlan: {
      roles: ['Event Coordinator', 'Logistics Manager', 'Creative Director', 'Venue Manager'],
      count: 4,
    },
    vendorRequirements: {
      catering: 'Mid-tier cocktails & canapés',
      av: 'Professional runway lighting and sound',
      photography: 'Runway and backstage coverage',
      security: 'Access control and backstage security',
    },
    budgetAllocations: [
      { category: 'Venue & Space', percentage: 30, allocatedAmount: budget * 0.3 },
      { category: 'Talent & Models', percentage: 20, allocatedAmount: budget * 0.2 },
      { category: 'Production (AV, Catering)', percentage: 25, allocatedAmount: budget * 0.25 },
      { category: 'Marketing & Media', percentage: 15, allocatedAmount: budget * 0.15 },
      { category: 'Operations & Staff', percentage: 5, allocatedAmount: budget * 0.05 },
      { category: 'Contingency', percentage: 5, allocatedAmount: budget * 0.05 },
    ],
    timelineMilestones: [
      { name: 'Finalize Scope & Define Success Criteria', dueInDays: 2, assignedTo: 'Event Coordinator', description: 'Confirm all event parameters and success metrics.' },
      { name: 'Book Venue & Sign Contract', dueInDays: 7, assignedTo: 'Venue Manager', description: 'Secure the venue for the event dates.' },
      { name: 'Confirm Participating Designers', dueInDays: 10, assignedTo: 'Creative Director', description: 'Finalize the list of designers showcasing their collections.' },
      { name: 'Launch Marketing & Media Outreach', dueInDays: 14, assignedTo: 'Event Coordinator', description: 'Begin promotional activities and media engagement.' },
      { name: 'Model Casting & Preliminary Fittings', dueInDays: 16, assignedTo: 'Creative Director', description: 'Select models and conduct initial fittings.' },
      { name: 'Finalize Vendor Contracts (AV, Catering, etc.)', dueInDays: 21, assignedTo: 'Logistics Coordinator', description: 'Sign all remaining vendor contracts.' },
      { name: 'Final Model Fittings & Show Choreography', dueInDays: timelineDays - 5, assignedTo: 'Creative Director', description: 'Complete final fittings and plan the runway show flow.' },
      { name: 'Event Day Execution & Breakdown', dueInDays: timelineDays, assignedTo: 'All', description: 'Execute the fashion show and manage post-event breakdown.' },
    ],
    stakeholders: [
      { role: 'Event Coordinator', responsibilities: 'Overall orchestration, budget, and timeline management.' },
      { role: 'Venue Manager', responsibilities: 'Space logistics, technical setup, and day-of facility management.' },
      { role: 'Logistics Coordinator', responsibilities: 'Vendor management, equipment coordination, and operations.' },
      { role: 'Creative Director', responsibilities: 'Designer relations, show creative, model casting, and media coordination.' },
    ],
    successCriteria: {
      timelineAdherence: '95% of milestones completed on time',
      budgetVariance: 'Total spending within 8% of allocated budget',
      attendanceRate: '85% RSVP fulfillment',
      mediaCoverage: 'Coverage in 5+ relevant fashion outlets',
    },
  };
}

function getFashionNetworkingFramework(attendeeCount: number, budget: number, timelineDays: number) {
  return {
    venueRequirements: {
      type: 'Cocktail Lounge/Rooftop Bar',
      sqft: attendeeCount * 20,
      features: ['Mingling areas', 'Bar service', 'Background music system', 'Coat check'],
    },
    attendeeMix: {
      'Industry Professionals': 0.8,
      'Emerging Designers': 0.2,
    },
    staffingPlan: {
      roles: ['Event Coordinator', 'Venue Liaison'],
      count: 2,
    },
    vendorRequirements: {
      catering: 'Cocktails and light appetizers',
      av: 'Background music and microphone for announcements',
      photography: 'Candid networking shots',
    },
    budgetAllocations: [
      { category: 'Venue & Catering', percentage: 50, allocatedAmount: budget * 0.5 },
      { category: 'Marketing & Invitations', percentage: 25, allocatedAmount: budget * 0.25 },
      { category: 'Operations & Staff', percentage: 15, allocatedAmount: budget * 0.15 },
      { category: 'Contingency', percentage: 10, allocatedAmount: budget * 0.1 },
    ],
    timelineMilestones: [
      { name: 'Finalize Guest List Criteria', dueInDays: 2, assignedTo: 'Event Coordinator', description: 'Define target audience for invitations.' },
      { name: 'Book Venue', dueInDays: 5, assignedTo: 'Event Coordinator', description: 'Secure and book the venue.' },
      { name: 'Send Invitations', dueInDays: 7, assignedTo: 'Event Coordinator', description: 'Distribute invitations to the guest list.' },
      { name: 'Confirm Vendors', dueInDays: 10, assignedTo: 'Event Coordinator', description: 'Finalize catering and other vendors.' },
      { name: 'Event Day', dueInDays: timelineDays, assignedTo: 'All', description: 'Execute the networking event.' },
    ],
    stakeholders: [
      { role: 'Event Coordinator', responsibilities: 'Overall planning and execution.' },
      { role: 'Venue Liaison', responsibilities: 'Coordination with the venue staff.' },
    ],
    successCriteria: {
      attendanceRate: '75% of invited guests attend',
      satisfaction: '90% positive feedback on networking opportunities',
      budgetVariance: 'Within 10% of allocated budget',
    },
  };
}

function getProductLaunchFramework(attendeeCount: number, budget: number, timelineDays: number) {
  return {
    venueRequirements: {
      type: 'Event Space/Loft',
      sqft: attendeeCount * 18,
      features: ['Presentation stage', 'Product display areas', 'High-quality AV', 'Good internet for streaming'],
    },
    attendeeMix: {
      'Buyers': 0.5,
      'Press/Media': 0.3,
      'Influencers': 0.2,
    },
    staffingPlan: {
      roles: ['Event Coordinator', 'PR Manager', 'Technical Director'],
      count: 3,
    },
    vendorRequirements: {
      catering: 'Themed appetizers and drinks',
      av: 'Presentation screen, microphones, live-streaming setup',
      photography: 'Product shots and event coverage',
      pr: 'Media and influencer outreach',
    },
    budgetAllocations: [
      { category: 'Venue & Production', percentage: 40, allocatedAmount: budget * 0.4 },
      { category: 'Marketing & PR', percentage: 30, allocatedAmount: budget * 0.3 },
      { category: 'Product Display & Experience', percentage: 15, allocatedAmount: budget * 0.15 },
      { category: 'Operations & Staff', percentage: 5, allocatedAmount: budget * 0.05 },
      { category: 'Contingency', percentage: 10, allocatedAmount: budget * 0.1 },
    ],
    timelineMilestones: [
      { name: 'Finalize Product Messaging', dueInDays: 3, assignedTo: 'PR Manager', description: 'Define key messages for the launch.' },
      { name: 'Book Venue', dueInDays: 7, assignedTo: 'Event Coordinator', description: 'Secure the launch venue.' },
      { name: 'Media & Influencer Outreach', dueInDays: 10, assignedTo: 'PR Manager', description: 'Begin outreach to press and influencers.' },
      { name: 'Finalize Technical Production Plan', dueInDays: 14, assignedTo: 'Technical Director', description: 'Lock in all AV and streaming details.' },
      { name: 'Event Day', dueInDays: timelineDays, assignedTo: 'All', description: 'Execute the product launch.' },
    ],
    stakeholders: [
      { role: 'Event Coordinator', responsibilities: 'Overall event logistics.' },
      { role: 'PR Manager', responsibilities: 'Media, influencer, and buyer relations.' },
      { role: 'Technical Director', responsibilities: 'AV, lighting, and presentation technology.' },
    ],
    successCriteria: {
      mediaCoverage: 'Coverage in 10+ key outlets',
      buyerAttendance: '90% of invited buyers attend',
      socialMediaReach: '1M+ impressions from event hashtags',
      budgetVariance: 'Within 5% of allocated budget',
    },
  };
}
