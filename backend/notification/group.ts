import { api } from "encore.dev/api";

export interface SendGroupInvitationRequest {
  recipientEmail: string;
  recipientName: string;
  inviterName: string;
  groupName: string;
  eventName: string;
  eventDate: Date;
  inviteCode: string;
}

export interface SendGroupReminderRequest {
  recipientEmail: string;
  recipientName: string;
  organizerName: string;
  groupName: string;
  eventName: string;
  eventDate: Date;
  inviteCode: string;
}

// Send group booking invitation email
export const sendGroupInvitation = api<SendGroupInvitationRequest, void>(
  { method: "POST", path: "/internal/send-group-invitation" },
  async ({ recipientEmail, recipientName, inviterName, groupName, eventName, eventDate, inviteCode }) => {
    console.log(`Sending group invitation to ${recipientEmail}`);
    console.log(`Inviter: ${inviterName}, Group: ${groupName}, Event: ${eventName}`);
    console.log(`Invite code: ${inviteCode}`);
    
    // In a real app, you would integrate with an email service
    // const emailContent = `
    //   Hi ${recipientName},
    //   
    //   ${inviterName} has invited you to join their group booking for "${eventName}"!
    //   
    //   Group: ${groupName}
    //   Event: ${eventName}
    //   Date: ${eventDate.toLocaleDateString()}
    //   
    //   Use invite code: ${inviteCode}
    //   
    //   Join now: [LINK TO GROUP BOOKING PAGE]
    // `;
  }
);

// Send group booking reminder email
export const sendGroupReminder = api<SendGroupReminderRequest, void>(
  { method: "POST", path: "/internal/send-group-reminder" },
  async ({ recipientEmail, recipientName, organizerName, groupName, eventName, eventDate, inviteCode }) => {
    console.log(`Sending group reminder to ${recipientEmail}`);
    console.log(`Organizer: ${organizerName}, Group: ${groupName}, Event: ${eventName}`);
    
    // In a real app, you would integrate with an email service
    // const emailContent = `
    //   Hi ${recipientName},
    //   
    //   This is a reminder that you haven't completed your booking for "${groupName}".
    //   
    //   Event: ${eventName}
    //   Date: ${eventDate.toLocaleDateString()}
    //   
    //   Don't miss out! Complete your booking now with code: ${inviteCode}
    // `;
  }
);
