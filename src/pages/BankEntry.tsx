import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadModels, detectFaceAndGetDescriptor, compareFaces } from '@/lib/faceApi';
import { supabase } from '@/integrations/supabase/client';
import { Camera, UserPlus, Scan, LayoutDashboard } from 'lucide-react';

const BankEntry = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setModelsReady(true);
        startWebcam();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to initialize face recognition',
          variant: 'destructive',
        });
      }
    };
    init();

    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const recognizeCustomer = async () => {
    if (!videoRef.current || !isStreaming || !modelsReady) return;

    setIsScanning(true);

    try {
      const descriptor = await detectFaceAndGetDescriptor(videoRef.current);

      if (!descriptor) {
        toast({
          title: 'No Face Detected',
          description: 'Please position your face clearly in the camera',
          variant: 'destructive',
        });
        setIsScanning(false);
        return;
      }

      // Fetch all customers from database
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*');

      if (error) throw error;

      let matchedCustomer = null;
      let bestMatch = 1.0; // Lower is better

      // Compare with all customers to find best match
      for (const customer of customers || []) {
        const faceDescriptors = customer.face_descriptors as any;
        if (!faceDescriptors) continue;

        const { webcam, uploadedImage } = faceDescriptors;

        // Try webcam descriptor
        if (webcam) {
          const webcamArray = Array.isArray(webcam) ? new Float32Array(webcam) : webcam;
          if (compareFaces(descriptor, webcamArray, 0.55)) {
            const distance = calculateDistance(descriptor, webcamArray);
            if (distance < bestMatch) {
              bestMatch = distance;
              matchedCustomer = customer;
            }
          }
        }

        // Try uploaded image descriptor
        if (uploadedImage) {
          const uploadArray = Array.isArray(uploadedImage) ? new Float32Array(uploadedImage) : uploadedImage;
          if (compareFaces(descriptor, uploadArray, 0.55)) {
            const distance = calculateDistance(descriptor, uploadArray);
            if (distance < bestMatch) {
              bestMatch = distance;
              matchedCustomer = customer;
            }
          }
        }
      }

      if (matchedCustomer) {
        // Calculate priority and add to queue
        const priorityMap: Record<string, number> = {
          'VIP': 1,
          'HNW': 2,
          'Elderly': 3,
          'Regular': 4,
        };

        // Check if customer is already in queue
        const { data: existingQueue } = await supabase
          .from('counter_queue')
          .select('*')
          .eq('customer_id', matchedCustomer.id)
          .eq('status', 'waiting')
          .maybeSingle();

        if (!existingQueue) {
          // Get last visit to determine current purpose
          const { data: lastVisit } = await supabase
            .from('visit_history')
            .select('*')
            .eq('customer_id', matchedCustomer.id)
            .order('visit_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          let suggestedPurpose = 'General inquiry';
          let suggestedOutcome = 'Service provided';

          // Intelligent purpose suggestion based on last visit
          if (lastVisit) {
            const lastPurpose = lastVisit.purpose.toLowerCase();
            const lastOutcome = lastVisit.outcome?.toLowerCase() || '';

            // Check for pending issues or follow-ups
            if (lastOutcome.includes('pending') || lastOutcome.includes('follow-up') || lastOutcome.includes('waiting')) {
              suggestedPurpose = `Follow-up: ${lastVisit.purpose}`;
              suggestedOutcome = 'Resolve pending issue';
            } else if (lastPurpose.includes('atm') || lastPurpose.includes('card')) {
              if (lastOutcome.includes('issue') || lastOutcome.includes('failed') || lastOutcome.includes('blocked')) {
                suggestedPurpose = 'ATM/Card issue follow-up';
                suggestedOutcome = 'Card replacement/activation';
              }
            } else if (lastPurpose.includes('loan') || lastPurpose.includes('credit')) {
              suggestedPurpose = 'Loan/Credit inquiry follow-up';
              suggestedOutcome = 'Loan status update';
            } else if (lastPurpose.includes('account') || lastPurpose.includes('opening')) {
              suggestedPurpose = 'Account services';
              suggestedOutcome = 'Account setup/modification';
            } else if (lastPurpose.includes('complaint') || lastPurpose.includes('grievance')) {
              suggestedPurpose = 'Complaint resolution follow-up';
              suggestedOutcome = 'Issue resolved';
            } else if (lastPurpose.includes('investment') || lastPurpose.includes('fd') || lastPurpose.includes('deposit')) {
              suggestedPurpose = 'Investment inquiry follow-up';
              suggestedOutcome = 'Investment advice provided';
            }
          }

          // Add to queue with intelligent suggestions
          await supabase
            .from('counter_queue')
            .insert({
              customer_id: matchedCustomer.id,
              priority: priorityMap[matchedCustomer.category] || 4,
              status: 'waiting',
              purpose: suggestedPurpose,
              expected_outcome: suggestedOutcome,
            });
        }

        toast({
          title: 'Customer Recognized',
          description: `Welcome back, ${matchedCustomer.full_name}!`,
        });
        
        setTimeout(() => {
          navigate('/staff-dashboard', { state: { customerId: matchedCustomer.id } });
        }, 1000);
      } else {
        toast({
          title: 'Customer Not Found',
          description: 'No matching customer record. Please register.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Recognition error:', error);
      toast({
        title: 'Recognition Failed',
        description: 'An error occurred during face recognition',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const calculateDistance = (desc1: Float32Array, desc2: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-primary-foreground">Smart Banking System</h1>
          <p className="text-xl text-primary-foreground/90">Face Recognition Entry</p>
        </div>

        <Card className="p-8 space-y-6 shadow-xl">
          <div className="relative rounded-xl overflow-hidden bg-muted aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {isScanning && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-2xl font-semibold text-primary">Scanning...</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={recognizeCustomer}
              disabled={!isStreaming || !modelsReady || isScanning}
              size="lg"
              className="h-16 text-lg"
            >
              <Scan className="w-6 h-6 mr-3" />
              Recognize Customer
            </Button>

            <Button
              onClick={() => navigate('/registration')}
              variant="outline"
              size="lg"
              className="h-16 text-lg"
            >
              <UserPlus className="w-6 h-6 mr-3" />
              New Registration
            </Button>

            <Button
              onClick={() => navigate('/counter-dashboard')}
              variant="outline"
              size="lg"
              className="h-16 text-lg"
            >
              <LayoutDashboard className="w-6 h-6 mr-3" />
              Counter Management
            </Button>
          </div>

          {!modelsReady && (
            <p className="text-center text-muted-foreground">
              Loading face recognition models...
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default BankEntry;
