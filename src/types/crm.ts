export type CRMStage =
  | 'Connection Pending'
  | 'Connected'
  | 'Booked Call'
  | 'Call Completed'
  | 'Pending Agreement'
  | 'Scheduled Collaboration'
  | 'Generating Revenue'
  | 'Inactive';

export const CRM_STAGES: CRMStage[] = [
  'Connection Pending',
  'Connected',
  'Booked Call',
  'Call Completed',
  'Pending Agreement',
  'Scheduled Collaboration',
  'Generating Revenue',
  'Inactive',
];

export interface CRMCard {
  id: string;
  user_id: string;
  partner_user_id: string;
  partner_business_id: string | null;
  connection_id: string | null;
  stage: CRMStage;
  company_name: string;
  partner_name: string;
  profile_image_url: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  notes: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CRMCardWithConnection extends CRMCard {
  connection?: {
    id: string;
    requester_user_id: string;
    recipient_user_id: string;
    status: 'pending' | 'accepted' | 'declined';
  };
}

export type ConnectionDirection = 'outgoing' | 'incoming';

export interface CRMCardDisplay extends CRMCardWithConnection {
  connectionDirection?: ConnectionDirection;
  isOutgoing?: boolean;
  isIncoming?: boolean;
  canAccept?: boolean;
  isFavorite?: boolean;
}
