import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerBadge } from '@/components/CustomerBadge';
import { useToast } from '@/hooks/use-toast';
import { findCustomerById, saveCustomer } from '@/lib/storage';
import { Customer, Behavior, Visit, BehaviorType } from '@/types/customer';
import { ArrowLeft, Mail, Phone, CreditCard, Plus, Save, Clock, TrendingUp, User, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

const behaviorColors: Record<BehaviorType, string> = {
  Happy: 'text-success',
  Irate: 'text-destructive',
  Cautious: 'text-accent',
  Neutral: 'text-muted-foreground',
  Anxious: 'text-destructive',
};

const Dashboard = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [newBehavior, setNewBehavior] = useState<Partial<Behavior>>({
    type: 'Neutral',
    context: '',
    timestamp: '',
  });

  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    date: '',
    purpose: '',
    outcome: '',
    staffNotes: '',
  });

  const [priorityCounter, setPriorityCounter] = useState<string>('');
  
  const getHandlingInstructions = () => {
    const instructions: string[] = [];
    
    if (customer?.tags.includes('VIP') || customer?.tags.includes('HNW')) {
      instructions.push('🌟 Priority service - Offer private banking area');
      instructions.push('💼 Consider wealth management opportunities');
    }
    
    if (customer?.tags.includes('Elderly')) {
      instructions.push('🤝 Provide extra assistance and patience');
      instructions.push('📱 Offer simplified digital banking guidance');
    }
    
    const latestBehavior = customer?.behavior[0];
    if (latestBehavior?.type === 'Irate') {
      instructions.push('⚠️ Customer is upset - Prioritize immediate attention');
      instructions.push('👤 Consider manager assistance');
    } else if (latestBehavior?.type === 'Anxious') {
      instructions.push('💬 Provide reassurance and clear explanations');
      instructions.push('⏱️ Take time to address all concerns');
    } else if (latestBehavior?.type === 'Happy') {
      instructions.push('😊 Great opportunity for additional services');
    }
    
    return instructions;
  };

  useEffect(() => {
    if (customerId) {
      const foundCustomer = findCustomerById(customerId);
      if (foundCustomer) {
        setCustomer(foundCustomer);
      } else {
        toast({
          title: 'Customer Not Found',
          description: 'Unable to find customer record',
          variant: 'destructive',
        });
        navigate('/');
      }
    }
  }, [customerId]);

  const handleAddBehavior = () => {
    if (!customer || !newBehavior.type || !newBehavior.context || !newBehavior.timestamp) return;

    const behavior: Behavior = {
      type: newBehavior.type as BehaviorType,
      context: newBehavior.context,
      timestamp: newBehavior.timestamp,
    };

    const updatedCustomer = {
      ...customer,
      behavior: [behavior, ...customer.behavior],
    };

    setCustomer(updatedCustomer);
    saveCustomer(updatedCustomer);
    setNewBehavior({ type: 'Neutral', context: '', timestamp: '' });

    toast({
      title: 'Behavior Updated',
      description: 'Customer behavior has been recorded',
    });
  };

  const handleAddVisit = () => {
    if (!customer || !newVisit.purpose || !newVisit.outcome || !newVisit.date) return;

    const visit: Visit = {
      date: newVisit.date,
      purpose: newVisit.purpose,
      outcome: newVisit.outcome,
      staffNotes: newVisit.staffNotes || '',
    };

    const updatedCustomer = {
      ...customer,
      visitHistory: [visit, ...customer.visitHistory],
    };

    setCustomer(updatedCustomer);
    saveCustomer(updatedCustomer);
    setNewVisit({ date: '', purpose: '', outcome: '', staffNotes: '' });

    toast({
      title: 'Visit Recorded',
      description: 'Visit history has been updated',
    });
  };

  const handleUpdateCurrentVisit = () => {
    if (!customer) return;

    const updatedCustomer = {
      ...customer,
      currentVisit: {
        purpose: newVisit.purpose || '',
        expectedOutcome: newVisit.outcome || '',
        staffNotes: newVisit.staffNotes || '',
      },
    };

    setCustomer(updatedCustomer);
    saveCustomer(updatedCustomer);

    toast({
      title: 'Current Visit Updated',
      description: 'Visit information has been saved',
    });
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading customer data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-primary text-primary-foreground p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Entry
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex gap-6">
              <div className="w-32 h-32 rounded-lg bg-primary-foreground/10 flex items-center justify-center border-2 border-primary-foreground/20">
                <User className="w-16 h-16 text-primary-foreground/50" />
              </div>
              
              <div>
                <h1 className="text-4xl font-bold mb-2">{customer.fullName}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {customer.tags.map((tag) => (
                    <CustomerBadge key={tag} category={tag} size="lg" />
                  ))}
                </div>
                <div className="space-y-1 text-primary-foreground/90">
                  <p className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Account: {customer.accountNumber}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {customer.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {customer.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Handling Instructions */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-primary" />
            Suggested Handling Instructions
          </h2>
          <div className="space-y-2">
            {getHandlingInstructions().map((instruction, index) => (
              <p key={index} className="text-foreground flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                <span>{instruction}</span>
              </p>
            ))}
          </div>
          
          {(customer.tags.includes('VIP') || customer.tags.includes('HNW') || customer.tags.includes('Elderly')) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Priority Counter Assignment</h3>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g., Counter 1, VIP Lounge, Private Banking"
                  value={priorityCounter}
                  onChange={(e) => setPriorityCounter(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => {
                  toast({
                    title: 'Counter Assigned',
                    description: `Customer assigned to: ${priorityCounter}`,
                  });
                }}>
                  Assign
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Behavior */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Current Behavior
              </h2>
            </div>

            {customer.behavior.length > 0 ? (
              <div className="space-y-3">
                {customer.behavior.slice(0, 3).map((behavior, index) => (
                  <div key={index} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-lg ${behaviorColors[behavior.type]}`}>
                        {behavior.type}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(behavior.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-foreground">{behavior.context}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No behavior recorded yet</p>
            )}

            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Add New Behavior</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newBehavior.timestamp}
                    onChange={(e) => setNewBehavior({ ...newBehavior, timestamp: e.target.value })}
                    required
                  />
                </div>

                <Select
                  value={newBehavior.type}
                  onValueChange={(value) => setNewBehavior({ ...newBehavior, type: value as BehaviorType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Happy">Happy</SelectItem>
                    <SelectItem value="Irate">Irate</SelectItem>
                    <SelectItem value="Cautious">Cautious</SelectItem>
                    <SelectItem value="Neutral">Neutral</SelectItem>
                    <SelectItem value="Anxious">Anxious</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Context (e.g., 'Happy because loan approved', 'Irate due to long wait time')"
                  value={newBehavior.context}
                  onChange={(e) => setNewBehavior({ ...newBehavior, context: e.target.value })}
                />

                <Button onClick={handleAddBehavior} className="w-full" disabled={!newBehavior.timestamp || !newBehavior.context}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Behavior
                </Button>
              </div>
            </div>
          </Card>

          {/* Current Visit */}
          <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Current Visit
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Visit Date</Label>
                <Input
                  type="date"
                  value={newVisit.date}
                  onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Visit Purpose</Label>
                <Input
                  placeholder="e.g., Loan application, Account inquiry"
                  value={newVisit.purpose}
                  onChange={(e) => setNewVisit({ ...newVisit, purpose: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Outcome</Label>
                <Input
                  placeholder="e.g., Loan approved, Issue resolved"
                  value={newVisit.outcome}
                  onChange={(e) => setNewVisit({ ...newVisit, outcome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Staff Notes</Label>
                <Textarea
                  placeholder="Internal notes about this visit..."
                  value={newVisit.staffNotes}
                  onChange={(e) => setNewVisit({ ...newVisit, staffNotes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleUpdateCurrentVisit} variant="outline" className="flex-1" disabled={!newVisit.date || !newVisit.purpose}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Current Visit
                </Button>
                <Button onClick={handleAddVisit} className="flex-1" disabled={!newVisit.date || !newVisit.purpose || !newVisit.outcome}>
                  <Plus className="w-4 h-4 mr-2" />
                  Complete & Add to History
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Visit History */}
        <Card className="p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Visit History</h2>

          {customer.visitHistory.length > 0 ? (
            <div className="space-y-4">
              {customer.visitHistory.map((visit, index) => (
                <div key={index} className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">{visit.purpose}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(visit.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-foreground">
                    <span className="font-medium">Outcome:</span> {visit.outcome}
                  </p>
                  {visit.staffNotes && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {visit.staffNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No visit history recorded yet</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
