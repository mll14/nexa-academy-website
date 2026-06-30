export type UserRole = 'admin' | 'student'

export interface AppPermission {
  id: number
  codename: string
  name: string
  resource: string
  action: string
}

export interface Role {
  id: number
  name: string
  slug: string
  description: string
  is_system: boolean
  permissions: AppPermission[]
  user_count: number
  created_at: string
  updated_at: string
}

export interface StaffUser {
  uid: string
  email: string
  display_name: string
  phone?: string
  photo_url?: string
  role: UserRole
  status: string
  created_at: string
  staff_role: Role | null
  individual_permissions: AppPermission[]
  effective_permissions: string[]
  invitation_accepted: boolean
}

export interface User {
  uid: string
  email: string
  display_name: string
  role: UserRole
  phone?: string
  photo_url?: string
  google_linked?: boolean
  fee_balance?: number
  total_fee_paid?: number
  program_fee?: number
  courses_enrolled?: Enrollment[]
  /** null = super admin (unrestricted). Non-null = role-scoped. */
  staffRole?: Role | null
  effectivePermissions?: string[]
}

export interface Program {
  program_id: string
  name: string
  slug: string
  description: string
  category: string
  level: string
  duration: string
  duration_months: number
  price: number | null
  original_price: number | null
  status: string
  thumbnail?: string
  image?: string
  icon?: string
  subtitle?: string
  coming_soon: boolean
  requirements: string[]
  skills: string[]
  offers_certificate: boolean
  topics: string[]
  curriculum: unknown[]
  features: string[]
  outcomes: string[]
  faq: unknown[]
  instructor?: string
  created_at: string
  updated_at: string
}

export interface ProgramMapped {
  id: string
  programId: string
  name: string
  title: string
  slug: string
  description: string
  category: string
  price: number | null
  originalPrice: number | null
  status: string
  image: string
  comingSoon: boolean
  durationMonths: number
  duration: string
}

export type IntakeMode = 'full_time_hybrid' | 'full_time_remote' | 'part_time_hybrid' | 'part_time_remote'

export interface Intake {
  id: string
  program: string
  program_name: string
  start_date: string
  end_date?: string
  application_deadline?: string
  max_seats?: number
  seats_remaining?: number
  status: 'open' | 'closed' | 'draft'
  mode: IntakeMode
  notes?: string
  created_at: string
}

export interface IntakeMapped {
  id: string
  programId: string
  programName: string
  startDate: string
  endDate?: string
  applicationDeadline?: string
  maxSeats?: number
  seatsRemaining?: number
  status: 'open' | 'closed' | 'draft'
  mode: IntakeMode
}

export type ApplicationStatus =
  | 'pending'
  | 'reviewed'
  | 'not_reached'
  | 'approved'
  | 'rejected'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'achieved'
  | 'enrolled'

export interface InterviewSlot {
  id: string
  chosen_time: string
  interview_type?: 'online' | 'physical'
  confirmed_at?: string
  meet_url?: string
  zoom_link?: string
  admin_approved: boolean
  completed: boolean
  gcal_event_id?: string
  extra_guests?: string[]
  student_gmail?: string
}

export interface Application {
  id: string
  user?: string
  user_id?: string
  full_name: string
  email: string
  phone: string
  program: string
  program_name: string
  status: ApplicationStatus
  estimated_fees: number
  payment_plan: string
  start_date?: string
  message?: string
  admin_notes?: string
  applied_at: string
  status_updated_at?: string
  interview_slot?: InterviewSlot
  logs?: ApplicationLog[]
  has_basic_knowledge?: boolean
  knowledge_description?: string
}

export interface ApplicationLog {
  id: string
  status: ApplicationStatus
  notes?: string
  created_at: string
  changed_by?: string
}

export interface AdminNote {
  id: string
  application?: string
  lead_type?: 'program_interest' | 'help_me' | 'incomplete_application'
  lead_id?: string
  stage: string
  html: string
  text?: string
  created_by?: string | null
  created_by_name?: string
  created_by_email?: string
  created_at: string
}

export interface Payment {
  id: string
  payment_id: string
  student_name?: string
  student_email?: string
  amount: string
  currency?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  payment_method?: string
  payment_reference?: string
  payment_type?: string
  mobile_number?: string
  transaction_id?: string
  program_name?: string
  description?: string
  notes?: string
  invoice_url?: string
  receipt_url?: string
  payment_date?: string
  confirmed_at?: string
  due_date?: string
  created_at: string
  updated_at?: string
}

export interface PaymentPlanChangeRequest {
  request_id: string
  enrollment: string
  student?: string
  student_name?: string
  student_email?: string
  program_name?: string
  enrollment_amount?: string
  enrollment_balance?: string
  current_payment_plan?: string
  current_installment_amount?: string | null
  requested_payment_plan: string
  requested_installment_amount: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  approved_payment_plan?: string
  approved_installment_amount?: string | null
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at?: string
}

export interface ReconciliationItem {
  enrollment_id?: string | null
  program_id?: string | null
  program_name: string
  total_fee: string
  amount_paid: string
  amount_remaining: string
  payment_plan: string
  installment_amount?: string | null
  status: 'paid' | 'outstanding'
  last_payment_date?: string | null
}

export interface ReconciliationLedgerLine {
  date?: string | null
  type: 'fee' | 'payment'
  description: string
  program_name?: string | null
  reference?: string | null
  status: string
  debit: string
  credit: string
  balance: string
  applied: boolean
}

export interface FinancialReconciliation {
  student_id: string
  student_name: string
  student_email: string
  total_fee: string
  amount_paid: string
  amount_remaining: string
  status: 'paid' | 'outstanding'
  items: ReconciliationItem[]
  ledger?: ReconciliationLedgerLine[]
}

export interface Enrollment {
  enrollment_id: string
  student: string
  program: string
  program_id?: string
  student_name: string
  student_email?: string
  program_name: string
  title?: string
  enrollment_date?: string
  start_date?: string
  end_date?: string
  progress?: number
  status: 'active' | 'completed' | 'withdrawn'
  payment_status?: string
  amount: number
  amount_paid: number
  balance: number
  payment_plan?: string
  installment_amount?: number | string | null
  student_details?: {
    uid: string
    email: string
    display_name: string
    phone?: string
  }
}

export interface ProgramInterest {
  id: string
  program_slug: string
  program_name: string
  name: string
  email: string
  phone?: string
  message?: string
  lead_status: LeadStatus
  follow_up_completed: boolean
  follow_up_completed_at?: string | null
  created_at: string
}

export interface HelpMeLead {
  id: string
  name: string
  email: string
  phone?: string
  message?: string
  lead_status: LeadStatus
  follow_up_completed: boolean
  follow_up_completed_at?: string | null
  assigned_program_slug: string
  assigned_program_name: string
  converted_to_pipeline: boolean
  converted_at?: string | null
  created_at: string
}

export interface IncompleteApplication {
  id: string
  name: string
  email: string
  phone?: string
  program_slug: string
  program_name: string
  step_reached: number
  lead_status: LeadStatus
  follow_up_completed: boolean
  follow_up_completed_at?: string | null
  created_at: string
  updated_at: string
}

export type LeadStatus = 'new' | 'contacted' | 'not_reached' | 'completed'

export interface Notification {
  id: string
  title: string
  message?: string
  read: boolean
  timestamp?: string
  created_at?: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone?: string
  subject?: string
  preferred_contact?: string
  message: string
  is_read: boolean
  status: string
  follow_up_completed: boolean
  follow_up_completed_at?: string | null
  created_at: string
}

export interface ApplicationStats {
  total?: number
  count?: number
  pending?: number
  not_reached?: number
  approved?: number
  rejected?: number
  enrolled?: number
  enrolled_count?: number
  interview_scheduled?: number
  interview_completed?: number
  achieved?: number
  reviewed?: number
}

export interface AvailableSlot {
  time: string
  status: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface NewsletterSubscriber {
  subscription_id: string
  email: string
  name: string
  status: 'active' | 'inactive'
  source: string
  subscribed_at: string
  unsubscribed_at?: string
}

export interface NewsletterCampaign {
  campaign_id: string
  subject: string
  preview_text: string
  html_body: string
  status: 'draft' | 'sent'
  sent_at?: string
  sent_count: number
  failed_count: number
  created_at: string
  updated_at: string
}

export interface ApiFilters {
  status?: string
  search?: string
  ordering?: string
  page?: number
  page_size?: number
  limit?: number
  email?: string
  program?: string
  program_name?: string
  [key: string]: string | number | undefined
}

export type AppointmentType = 'physical' | 'virtual'
export type AppointmentHost = 'admissions_manager' | 'technical_mentor'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: string
  name: string
  email: string
  phone: string
  appointment_type: AppointmentType
  appointment_type_label: string
  host: AppointmentHost
  host_label: string
  chosen_time: string
  reason: string
  status: AppointmentStatus
  status_label: string
  gcal_event_id: string
  meet_url: string
  admin_notes: string
  created_at: string
  updated_at: string
}
