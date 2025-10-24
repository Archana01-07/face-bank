import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WebcamCapture } from '@/components/WebcamCapture';
import { useToast } from '@/hooks/use-toast';
import { loadModels, detectFaceAndGetDescriptor } from '@/lib/faceApi';
import { supabase } from '@/integrations/supabase/client';
import { CustomerCategory } from '@/types/customer';
import { Upload, Loader2, UserPlus } from 'lucide-react';

const Registration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [webcamDescriptor, setWebcamDescriptor] = useState<Float32Array | null>(null);
  const [uploadedDescriptor, setUploadedDescriptor] = useState<Float32Array | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    accountNumber: '',
    phone: '',
    email: '',
    category: 'Regular' as CustomerCategory,
  });

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setModelsReady(true);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load face recognition models',
          variant: 'destructive',
        });
      }
    };
    init();
  }, []);

  const handleWebcamCapture = async (video: HTMLVideoElement) => {
    setIsLoading(true);
    try {
      const descriptor = await detectFaceAndGetDescriptor(video);
      
      if (!descriptor) {
        toast({
          title: 'No Face Detected',
          description: 'Please ensure your face is clearly visible',
          variant: 'destructive',
        });
        return;
      }

      setWebcamDescriptor(descriptor);
      toast({
        title: 'Success',
        description: 'Face captured successfully from webcam',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to capture face from webcam',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const img = await createImageElement(file);
      const descriptor = await detectFaceAndGetDescriptor(img);

      if (!descriptor) {
        toast({
          title: 'No Face Detected',
          description: 'Please upload an image with a clear face',
          variant: 'destructive',
        });
        return;
      }

      setUploadedDescriptor(descriptor);
      toast({
        title: 'Success',
        description: 'Face captured successfully from uploaded image',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process uploaded image',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webcamDescriptor && !uploadedDescriptor) {
      toast({
        title: 'Face Required',
        description: 'Please capture at least one face image',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save customer to database
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          full_name: formData.fullName,
          account_number: formData.accountNumber,
          phone: formData.phone,
          email: formData.email,
          category: formData.category,
          face_descriptors: {
            webcam: webcamDescriptor ? Array.from(webcamDescriptor) : null,
            uploadedImage: uploadedDescriptor ? Array.from(uploadedDescriptor) : null,
          },
        })
        .select()
        .single();

      if (customerError) throw customerError;

      toast({
        title: 'Registration Complete',
        description: `${formData.fullName} has been registered successfully`,
      });

      // Redirect to entry page to add to queue
      navigate('/');
    } catch (error) {
      console.error('Error during registration:', error);
      toast({
        title: 'Registration Failed',
        description: 'Failed to register customer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Customer Registration</h1>
          <p className="text-muted-foreground">Register new customers with face recognition</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Customer Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as CustomerCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="HNW">High Net Worth</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="Elderly">Elderly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Face Recognition</h2>
              
              <div className="space-y-4">
                <div>
                  <Label className="mb-3 block">Webcam Capture (Required)</Label>
                  <WebcamCapture
                    onCapture={handleWebcamCapture}
                    disabled={!modelsReady || isLoading}
                  />
                  {webcamDescriptor && (
                    <p className="text-sm text-success mt-2">✓ Webcam face captured</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="imageUpload" className="mb-3 block">
                    Upload Image (Optional)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('imageUpload')?.click()}
                      disabled={!modelsReady || isLoading}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Image
                    </Button>
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {uploadedDescriptor && (
                      <p className="text-sm text-success">✓ Uploaded face captured</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !modelsReady || (!webcamDescriptor && !uploadedDescriptor)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register Customer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Registration;
