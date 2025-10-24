import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerBadge } from '@/components/CustomerBadge';
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/dateUtils';

interface QueueCustomer {
  id: string;
  customer_id: string;
  counter_name: string | null;
  priority: number;
  status: string;
  purpose: string;
  expected_outcome: string;
  staff_notes: string;
  created_at: string;
  customers: {
    id: string;
    full_name: string;
    account_number: string;
    category: string;
  };
}

interface Behavior {
  behavior_type: string;
  timestamp: string;
}

const counterOptions = [
  { value: 'Counter 1 – Regular Services', label: 'Counter 1', description: 'Regular Services' },
  { value: 'Counter 2 – Senior Citizen Desk', label: 'Counter 2', description: 'Senior Citizen Desk' },
  { value: 'Counter 3 – VIP / HNW Lounge', label: 'Counter 3', description: 'VIP/HNW Lounge' },
  { value: 'Counter 4 – Grievance & Complaint Resolution', label: 'Counter 4', description: 'Grievances' },
  { value: 'Counter 5 – Loan & Investment Advisory', label: 'Counter 5', description: 'Loans & Investment' },
  { value: 'Queries', label: 'Queries', description: 'General Queries' },
  { value: 'VIP', label: 'VIP Counter', description: 'VIP Fast-Track' },
];

const CounterDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [queueCustomers, setQueueCustomers] = useState<QueueCustomer[]>([]);
  const [behaviors, setBehaviors] = useState<Record<string, Behavior[]>>({});
  const [loading, setLoading] = useState(true);
  const [assigningCounter, setAssigningCounter] = useState<string | null>(null);

  useEffect(() => {
    loadQueueData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('counter-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counter_queue'
        },
        () => {
          loadQueueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadQueueData = async () => {
    setLoading(true);
    try {
      // Load all waiting queue entries with customer details
      const { data: queueData, error: queueError } = await supabase
        .from('counter_queue')
        .select(`
          *,
          customers (
            id,
            full_name,
            account_number,
            category
          )
        `)
        .eq('status', 'waiting')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (queueError) throw queueError;
      setQueueCustomers(queueData || []);

      // Load recent behaviors for all customers
      if (queueData && queueData.length > 0) {
        const customerIds = queueData.map(q => q.customer_id);
        const { data: behaviorsData, error: behaviorsError } = await supabase
          .from('customer_behaviors')
          .select('customer_id, behavior_type, timestamp')
          .in('customer_id', customerIds)
          .order('timestamp', { ascending: false });

        if (behaviorsError) throw behaviorsError;

        // Group behaviors by customer_id
        const behaviorsByCustomer: Record<string, Behavior[]> = {};
        behaviorsData?.forEach(behavior => {
          if (!behaviorsByCustomer[behavior.customer_id]) {
            behaviorsByCustomer[behavior.customer_id] = [];
          }
          if (behaviorsByCustomer[behavior.customer_id].length < 3) {
            behaviorsByCustomer[behavior.customer_id].push(behavior);
          }
        });
        setBehaviors(behaviorsByCustomer);
      }
    } catch (error) {
      console.error('Error loading queue data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load queue data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCounter = async (queueId: string, counterName: string) => {
    setAssigningCounter(queueId);
    try {
      const { error } = await supabase
        .from('counter_queue')
        .update({ counter_name: counterName })
        .eq('id', queueId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Counter assigned successfully`,
      });

      loadQueueData();
    } catch (error) {
      console.error('Error assigning counter:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign counter',
        variant: 'destructive',
      });
    } finally {
      setAssigningCounter(null);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 90) return <Badge className="bg-purple-600">Critical</Badge>;
    if (priority >= 70) return <Badge className="bg-orange-600">High</Badge>;
    if (priority >= 50) return <Badge className="bg-yellow-600">Medium</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  const getBehaviorBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Happy': 'bg-green-600',
      'Irate': 'bg-red-600',
      'Anxious': 'bg-yellow-600',
      'Cautious': 'bg-orange-600',
      'Neutral': 'bg-gray-600'
    };
    return <Badge className={colors[type] || 'bg-gray-600'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Counter Management</h1>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-lg font-semibold">{queueCustomers.length} in Queue</span>
          </div>
        </div>

        {/* Queue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Waiting</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{queueCustomers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {queueCustomers.filter(q => q.counter_name).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">
                {queueCustomers.filter(q => !q.counter_name).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {queueCustomers.filter(q => q.priority >= 70).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Queue List */}
        {queueCustomers.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No customers in queue</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {queueCustomers.map((entry) => (
              <Card key={entry.id} className="overflow-hidden">
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Customer Info - 3 cols */}
                    <div className="lg:col-span-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CustomerBadge category={entry.customers.category as any} />
                        {getPriorityBadge(entry.priority)}
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        {entry.customers.full_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {entry.customers.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Arrived: {formatDateTime(entry.created_at)}
                      </p>
                    </div>

                    {/* Purpose & Details - 4 cols */}
                    <div className="lg:col-span-4 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">PURPOSE OF VISIT</p>
                        <p className="text-sm font-medium text-foreground">
                          {entry.purpose || 'Not specified'}
                        </p>
                      </div>
                      {entry.expected_outcome && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">EXPECTED OUTCOME</p>
                          <p className="text-sm text-foreground">{entry.expected_outcome}</p>
                        </div>
                      )}
                      {behaviors[entry.customer_id] && behaviors[entry.customer_id].length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">RECENT BEHAVIORS</p>
                          <div className="flex flex-wrap gap-1">
                            {behaviors[entry.customer_id].map((behavior, idx) => (
                              <span key={idx}>{getBehaviorBadge(behavior.behavior_type)}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes - 3 cols */}
                    <div className="lg:col-span-3">
                      {entry.staff_notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">STAFF NOTES</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {entry.staff_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Counter Assignment - 2 cols */}
                    <div className="lg:col-span-2 flex flex-col justify-center">
                      {entry.counter_name ? (
                        <div className="text-center">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">ASSIGNED TO</p>
                          <Badge className="text-sm py-2 px-3 bg-green-600">
                            {counterOptions.find(c => c.value === entry.counter_name)?.label || entry.counter_name}
                          </Badge>
                        </div>
                      ) : (
                        <Select
                          disabled={assigningCounter === entry.id}
                          onValueChange={(value) => handleAssignCounter(entry.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Assign Counter" />
                          </SelectTrigger>
                          <SelectContent>
                            {counterOptions.map((counter) => (
                              <SelectItem key={counter.value} value={counter.value}>
                                <div>
                                  <div className="font-semibold">{counter.label}</div>
                                  <div className="text-xs text-muted-foreground">{counter.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CounterDashboard;
