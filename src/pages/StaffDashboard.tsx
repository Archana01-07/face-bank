import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { ArrowLeft, User, Phone, Mail, CreditCard, Clock, MessageSquare, FileText, Plus, Edit, CheckCircle, CalendarIcon } from 'lucide-react';
import { CustomerBadge } from '@/components/CustomerBadge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Customer {
  id: string;
  full_name: string;
  account_number: string;
  phone: string;
  email: string;
  category: string;
  registered_at: string;
}

interface Behavior {
  id: string;
  behavior_type: string;
  context: string;
  timestamp: string;
}

interface Visit {
  id: string;
  visit_date: string;
  purpose: string;
  outcome: string;
  staff_notes: string;
}

interface QueueEntry {
  id: string;
  counter_name: string | null;
  priority: number;
  status: string;
  purpose: string;
  expected_outcome: string;
  staff_notes: string;
  created_at: string;
}

interface AIInsights {
  priorityNote: string;
}

const StaffDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const customerId = location.state?.customerId;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [visitHistory, setVisitHistory] = useState<Visit[]>([]);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(true);
  const [showBehaviorDialog, setShowBehaviorDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [behaviorForm, setBehaviorForm] = useState({ type: 'Neutral', context: '', date: new Date() });
  const [visitForm, setVisitForm] = useState({ purpose: '', outcome: '', notes: '', date: new Date() });
  const [counterName, setCounterName] = useState<string>('');

  const counterOptions = [
    { value: 'Counter 1 – Regular Services', label: 'Counter 1 – Regular Services', description: 'Standard banking services' },
    { value: 'Counter 2 – Senior Citizen Desk', label: 'Counter 2 – Senior Citizen Desk', description: 'Elderly customer assistance' },
    { value: 'Counter 3 – VIP / HNW Lounge', label: 'Counter 3 – VIP / HNW Lounge', description: 'Exclusive counter for VIP/HNW' },
    { value: 'Counter 4 – Grievance & Complaint Resolution', label: 'Counter 4 – Grievance & Complaints', description: 'Issue resolution' },
    { value: 'Counter 5 – Loan & Investment Advisory', label: 'Counter 5 – Loan & Investment', description: 'Financial advisory' },
    { value: 'Queries', label: 'Queries Counter', description: 'General inquiries' },
    { value: 'VIP', label: 'VIP Counter', description: 'Fast-track VIP service' },
  ];

  useEffect(() => {
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'No customer selected',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      // Load customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Load behaviors
      const { data: behaviorsData, error: behaviorsError } = await supabase
        .from('customer_behaviors')
        .select('*')
        .eq('customer_id', customerId)
        .order('timestamp', { ascending: false });

      if (behaviorsError) throw behaviorsError;
      setBehaviors(behaviorsData || []);

      // Load visit history
      const { data: visitsData, error: visitsError } = await supabase
        .from('visit_history')
        .select('*')
        .eq('customer_id', customerId)
        .order('visit_date', { ascending: false });

      if (visitsError) throw visitsError;
      setVisitHistory(visitsData || []);

      // Load current queue entry
      const { data: queueData, error: queueError } = await supabase
        .from('counter_queue')
        .select('*')
        .eq('customer_id', customerId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queueError) throw queueError;
      setQueueEntry(queueData);

      // Load AI insights
      await loadAIInsights(customerData, behaviorsData, visitsData);

    } catch (error) {
      console.error('Error loading customer data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAIInsights = async (customer: Customer, behaviors: Behavior[], visits: Visit[]) => {
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-insights', {
        body: {
          customerData: {
            category: customer.category,
            lastVisit: visits[0] ? {
              purpose: visits[0].purpose,
              outcome: visits[0].outcome,
              staff_notes: visits[0].staff_notes,
            } : undefined,
            behaviors: behaviors.slice(0, 5).map(b => ({
              behavior_type: b.behavior_type,
              context: b.context,
              timestamp: b.timestamp,
            })),
          },
        },
      });

      if (error) throw error;
      
      if (data?.insights) {
        setAiInsights(data.insights);
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
      toast({
        title: 'AI Insights Unavailable',
        description: 'Proceeding without AI recommendations',
        variant: 'default',
      });
    } finally {
      setLoadingInsights(false);
    }
  };

  const getPriorityColor = (category: string) => {
    switch (category) {
      case 'VIP': return 'text-purple-600';
      case 'HNW': return 'text-blue-600';
      case 'Elderly': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getBehaviorColor = (type: string) => {
    switch (type) {
      case 'Happy': return 'bg-green-100 text-green-800';
      case 'Irate': return 'bg-red-100 text-red-800';
      case 'Anxious': return 'bg-yellow-100 text-yellow-800';
      case 'Cautious': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerTips = (category: string) => {
    switch (category) {
      case 'VIP':
        return [
          '🌟 Provide immediate, personalized attention',
          '💼 Offer premium services and exclusive benefits',
          '⚡ Prioritize their requests with expedited processing',
          '🤝 Maintain professional yet warm demeanor'
        ];
      case 'HNW':
        return [
          '💎 Focus on wealth management opportunities',
          '📊 Discuss investment options and financial planning',
          '🎯 Provide tailored solutions for their portfolio',
          '⏰ Respect their time with efficient service'
        ];
      case 'Elderly':
        return [
          '❤️ Be patient and speak clearly',
          '👂 Listen attentively to their concerns',
          '📝 Explain procedures step-by-step',
          '🪑 Offer seating and assistance as needed'
        ];
      default:
        return [
          '😊 Provide friendly and efficient service',
          '📋 Address their needs professionally',
          '⏱️ Maintain reasonable wait times',
          '✅ Ensure all questions are answered'
        ];
    }
  };

  const handleAddBehavior = async () => {
    if (!customer || !behaviorForm.type) return;

    try {
      const { error } = await supabase
        .from('customer_behaviors')
        .insert({
          customer_id: customer.id,
          behavior_type: behaviorForm.type,
          context: behaviorForm.context,
          timestamp: behaviorForm.date.toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Behavior record added',
      });

      setShowBehaviorDialog(false);
      setBehaviorForm({ type: 'Neutral', context: '', date: new Date() });
      loadCustomerData();
    } catch (error) {
      console.error('Error adding behavior:', error);
      toast({
        title: 'Error',
        description: 'Failed to add behavior record',
        variant: 'destructive',
      });
    }
  };

  const handleAddVisit = async () => {
    if (!customer || !visitForm.purpose) return;

    try {
      // Insert new visit history
      const { error: visitError } = await supabase
        .from('visit_history')
        .insert({
          customer_id: customer.id,
          purpose: visitForm.purpose,
          outcome: visitForm.outcome,
          staff_notes: visitForm.notes,
          visit_date: visitForm.date.toISOString(),
        });

      if (visitError) throw visitError;

      // Update current queue entry with the new purpose and expected outcome
      if (queueEntry) {
        const { error: queueError } = await supabase
          .from('counter_queue')
          .update({
            purpose: visitForm.purpose,
            expected_outcome: visitForm.outcome || 'Pending',
            staff_notes: visitForm.notes,
          })
          .eq('id', queueEntry.id);

        if (queueError) throw queueError;
      }

      toast({
        title: 'Success',
        description: 'Visit recorded and current visit updated',
      });

      setShowVisitDialog(false);
      setVisitForm({ purpose: '', outcome: '', notes: '', date: new Date() });
      loadCustomerData();
    } catch (error) {
      console.error('Error adding visit:', error);
      toast({
        title: 'Error',
        description: 'Failed to add visit record',
        variant: 'destructive',
      });
    }
  };

  const handleAssignCounter = async () => {
    if (!queueEntry || !counterName) return;

    try {
      const { error } = await supabase
        .from('counter_queue')
        .update({ counter_name: counterName })
        .eq('id', queueEntry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Assigned to ${counterName}`,
      });

      setShowCounterDialog(false);
      setCounterName('');
      loadCustomerData();
    } catch (error) {
      console.error('Error assigning counter:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign counter',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteService = async () => {
    if (!queueEntry || !customer) return;

    try {
      // Mark queue entry as completed
      const { error: queueError } = await supabase
        .from('counter_queue')
        .update({ status: 'completed' })
        .eq('id', queueEntry.id);

      if (queueError) throw queueError;

      // Add to visit history
      const { error: visitError } = await supabase
        .from('visit_history')
        .insert({
          customer_id: customer.id,
          purpose: queueEntry.purpose || 'Visit completed',
          outcome: queueEntry.expected_outcome || 'Service provided',
          staff_notes: queueEntry.staff_notes || '',
        });

      if (visitError) throw visitError;

      toast({
        title: 'Success',
        description: 'Service completed and added to visit history',
      });

      navigate('/');
    } catch (error) {
      console.error('Error completing service:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete service',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <p className="text-center text-muted-foreground">Customer not found</p>
          <Button onClick={() => navigate('/')} className="w-full mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Staff Dashboard</h1>
          <div className="w-24"></div>
        </div>

        {/* Customer Info Dialog */}
        <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customer Information & Handling Tips</DialogTitle>
              <DialogDescription>Priority customer recognized - review handling guidelines</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Category:</span>
                <CustomerBadge category={customer.category as any} />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Priority Information:</p>
                <p className={`font-semibold ${getPriorityColor(customer.category)}`}>
                  {customer.category === 'VIP' && 'Highest Priority - Expedited Service'}
                  {customer.category === 'HNW' && 'High Priority - Premium Service'}
                  {customer.category === 'Elderly' && 'Priority Service - Extra Assistance'}
                  {customer.category === 'Regular' && 'Standard Service'}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm font-semibold mb-2">💡 Handling Tips:</p>
                <ul className="space-y-1 text-sm">
                  {getCustomerTips(customer.category).map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
              {queueEntry && (
                <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold mb-1">Counter Assignment:</p>
                    <p className="text-2xl font-bold text-primary">
                      {queueEntry.counter_name || 'Pending'}
                    </p>
                  </div>
                  {!queueEntry.counter_name && (
                    <Button onClick={() => setShowCounterDialog(true)} size="sm">
                      Assign Counter
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Behavior Dialog */}
        <Dialog open={showBehaviorDialog} onOpenChange={setShowBehaviorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Behavior Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date (dd-mm-yyyy)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !behaviorForm.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {behaviorForm.date ? format(behaviorForm.date, 'dd-MM-yyyy') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={behaviorForm.date}
                      onSelect={(date) => date && setBehaviorForm({ ...behaviorForm, date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Behavior Type</Label>
                <Select value={behaviorForm.type} onValueChange={(value) => setBehaviorForm({ ...behaviorForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Happy">Happy</SelectItem>
                    <SelectItem value="Neutral">Neutral</SelectItem>
                    <SelectItem value="Anxious">Anxious</SelectItem>
                    <SelectItem value="Cautious">Cautious</SelectItem>
                    <SelectItem value="Irate">Irate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Context</Label>
                <Textarea
                  value={behaviorForm.context}
                  onChange={(e) => setBehaviorForm({ ...behaviorForm, context: e.target.value })}
                  placeholder="Describe the customer's behavior..."
                  rows={3}
                />
              </div>
              <Button onClick={handleAddBehavior} className="w-full">Add Behavior</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Visit Dialog */}
        <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Visit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date (dd-mm-yyyy)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !visitForm.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {visitForm.date ? format(visitForm.date, 'dd-MM-yyyy') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={visitForm.date}
                      onSelect={(date) => date && setVisitForm({ ...visitForm, date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input
                  value={visitForm.purpose}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  placeholder="Purpose of visit..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Input
                  value={visitForm.outcome}
                  onChange={(e) => setVisitForm({ ...visitForm, outcome: e.target.value })}
                  placeholder="What was accomplished..."
                />
              </div>
              <div className="space-y-2">
                <Label>Staff Notes</Label>
                <Textarea
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
              <Button onClick={handleAddVisit} className="w-full">Record Visit</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Counter Dialog */}
        <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Counter</DialogTitle>
              <DialogDescription>Select the appropriate counter based on customer category and needs</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Counter</Label>
                <Select value={counterName} onValueChange={setCounterName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a counter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {counterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-semibold">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignCounter} className="w-full" disabled={!counterName}>
                Assign Counter
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Details */}
          <Card className="p-6 lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Details
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-semibold">{customer.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <CreditCard className="w-4 h-4 mr-1" />
                  Account Number
                </p>
                <p className="font-semibold">{customer.account_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  Phone
                </p>
                <p className="font-semibold">{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </p>
                <p className="font-semibold">{customer.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <CustomerBadge category={customer.category as any} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Registered
                </p>
                <p className="font-semibold">{formatDate(customer.registered_at)}</p>
              </div>
            </div>
          </Card>

          {/* Behavior History & Current Visit */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Insights - Positive Outcome & Action Steps */}
            {aiInsights && (
              <Card className="p-6 border-2 border-green-500/50 bg-green-50 dark:bg-green-950">
                <h2 className="text-xl font-semibold mb-4 flex items-center text-green-700 dark:text-green-300">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  AI-Powered Recommendations
                </h2>
                
                <div className="p-4 bg-white dark:bg-background rounded-lg border-2 border-green-500">
                  <p className="text-sm font-bold text-green-700 dark:text-green-300 mb-2">
                    ⚠️ Priority Note
                  </p>
                  <p className="font-semibold text-base">{aiInsights.priorityNote}</p>
                </div>
              </Card>
            )}

            {loadingInsights && (
              <Card className="p-6 border-2 border-primary/30">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Generating AI insights...</p>
                </div>
              </Card>
            )}

            {/* Current Queue Status & Actions */}
            {queueEntry && (
              <Card className="p-6 border-2 border-primary/50 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Current Visit (HIGHLY IMPORTANT)</h2>
                  <Button onClick={handleCompleteService} size="sm" variant="outline">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Service
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Counter</p>
                    <p className="text-2xl font-bold text-primary">
                      {queueEntry.counter_name || 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="text-2xl font-bold">{queueEntry.priority}</p>
                  </div>
                  <div className="col-span-4 p-3 bg-background rounded-lg border-2 border-primary">
                    <p className="text-sm font-bold text-primary mb-1">Purpose of Visit</p>
                    <p className="font-semibold text-lg">{queueEntry.purpose || 'Not specified'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setShowBehaviorDialog(true)} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Behavior
                  </Button>
                  <Button onClick={() => setShowVisitDialog(true)} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Record Visit
                  </Button>
                </div>
              </Card>
            )}

            {/* Behavior History */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Behavior History
              </h2>
              {behaviors.length > 0 ? (
                <div className="space-y-3">
                  {behaviors.map((behavior) => (
                    <div key={behavior.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                         <Badge className={getBehaviorColor(behavior.behavior_type)}>
                          {behavior.behavior_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(behavior.timestamp)}
                        </span>
                      </div>
                      {behavior.context && (
                        <p className="text-sm text-muted-foreground">{behavior.context}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No behavior history recorded</p>
              )}
            </Card>

            {/* Visit History */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Visit History
              </h2>
              {visitHistory.length > 0 ? (
                <div className="space-y-4">
                  {visitHistory.map((visit) => (
                    <div key={visit.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{visit.purpose}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(visit.visit_date)}
                          </p>
                        </div>
                      </div>
                      {visit.outcome && (
                        <div>
                          <p className="text-sm font-semibold">Outcome:</p>
                          <p className="text-sm text-muted-foreground">{visit.outcome}</p>
                        </div>
                      )}
                      {visit.staff_notes && (
                        <div>
                          <p className="text-sm font-semibold">Staff Notes:</p>
                          <p className="text-sm text-muted-foreground">{visit.staff_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No previous visits recorded</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
