import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, User, Mail, Phone, DollarSign, 
  Calendar, Target, Globe, MapPin, Users,
  CheckCircle, ArrowRight, Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import backend from '~backend/client';

export function SponsorLeadForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Company information
    companyName: '',
    industry: '',
    website: '',
    companySize: '',
    annualRevenue: '',
    headquartersLocation: '',
    companyDescription: '',
    
    // Contact information
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    jobTitle: '',
    
    // Sponsorship details
    budgetRange: '',
    objectives: [] as string[],
    preferredEvents: [] as string[],
    timeline: '',
    additionalNotes: '',
  });

  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const createLeadMutation = useMutation({
    mutationFn: () => backend.sponsor.createLead({
      companyName: formData.companyName,
      industry: formData.industry,
      website: formData.website,
      companySize: formData.companySize as any,
      annualRevenue: formData.annualRevenue ? parseInt(formData.annualRevenue) : undefined,
      headquartersLocation: formData.headquartersLocation,
      companyDescription: formData.companyDescription,
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      jobTitle: formData.jobTitle,
      budgetRange: formData.budgetRange as any,
      objectives: formData.objectives,
      preferredEvents: formData.preferredEvents,
      timeline: formData.timeline as any,
      leadSource: 'website_form',
      additionalNotes: formData.additionalNotes,
    }),
    onSuccess: (data) => {
      setSubmissionResult(data);
      setStep(4);
      toast({
        title: "Inquiry Received!",
        description: "Our team will review your submission and get back to you shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLeadMutation.mutate();
  };

  const handleObjectiveChange = (objective: string) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter(o => o !== objective)
        : [...prev.objectives, objective]
    }));
  };

  const objectivesOptions = [
    'Brand Awareness',
    'Lead Generation',
    'Product Showcase',
    'Networking',
    'Thought Leadership',
    'Recruitment',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Become a Sponsor</CardTitle>
            <p className="text-gray-400">Partner with us to reach a dedicated fashion audience.</p>
            <Progress value={(step / 4) * 100} className="mt-4" />
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Step 1: Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName" className="text-gray-300">Company Name</Label>
                    <Input id="companyName" value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} required className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="industry" className="text-gray-300">Industry</Label>
                    <Input id="industry" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} required className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="website" className="text-gray-300">Website</Label>
                  <Input id="website" type="url" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companySize" className="text-gray-300">Company Size</Label>
                    <Select value={formData.companySize} onValueChange={(value) => setFormData({...formData, companySize: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select size" /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="startup">Startup (1-10)</SelectItem>
                        <SelectItem value="small">Small (11-50)</SelectItem>
                        <SelectItem value="medium">Medium (51-200)</SelectItem>
                        <SelectItem value="large">Large (201-1000)</SelectItem>
                        <SelectItem value="enterprise">Enterprise (1000+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="annualRevenue" className="text-gray-300">Annual Revenue (USD)</Label>
                    <Input id="annualRevenue" type="number" value={formData.annualRevenue} onChange={(e) => setFormData({...formData, annualRevenue: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleNextStep} className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Step 2: Contact & Budget</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactName" className="text-gray-300">Contact Name</Label>
                    <Input id="contactName" value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} required className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail" className="text-gray-300">Contact Email</Label>
                    <Input id="contactEmail" type="email" value={formData.contactEmail} onChange={(e) => setFormData({...formData, contactEmail: e.target.value})} required className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPhone" className="text-gray-300">Phone Number</Label>
                    <Input id="contactPhone" type="tel" value={formData.contactPhone} onChange={(e) => setFormData({...formData, contactPhone: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                  <div>
                    <Label htmlFor="jobTitle" className="text-gray-300">Job Title</Label>
                    <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budgetRange" className="text-gray-300">Estimated Budget (USD)</Label>
                    <Select value={formData.budgetRange} onValueChange={(value) => setFormData({...formData, budgetRange: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select budget" /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="under_5k">Under $5,000</SelectItem>
                        <SelectItem value="5k_15k">$5,000 - $15,000</SelectItem>
                        <SelectItem value="15k_50k">$15,000 - $50,000</SelectItem>
                        <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                        <SelectItem value="over_100k">Over $100,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timeline" className="text-gray-300">Timeline</Label>
                    <Select value={formData.timeline} onValueChange={(value) => setFormData({...formData, timeline: value})}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Select timeline" /></SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="next_month">Next Month</SelectItem>
                        <SelectItem value="next_quarter">Next Quarter</SelectItem>
                        <SelectItem value="next_year">Next Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handlePrevStep}>Back</Button>
                  <Button type="submit">Next <ArrowRight className="h-4 w-4 ml-2" /></Button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Step 3: Objectives & Notes</h3>
                <div>
                  <Label className="text-gray-300">What are your main objectives?</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    {objectivesOptions.map(objective => (
                      <div key={objective} className="flex items-center space-x-2">
                        <Checkbox 
                          id={objective} 
                          checked={formData.objectives.includes(objective)}
                          onCheckedChange={() => handleObjectiveChange(objective)}
                        />
                        <Label htmlFor={objective} className="text-gray-300">{objective}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="additionalNotes" className="text-gray-300">Additional Notes</Label>
                  <Textarea id="additionalNotes" value={formData.additionalNotes} onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handlePrevStep}>Back</Button>
                  <Button type="submit" disabled={createLeadMutation.isPending}>
                    {createLeadMutation.isPending ? 'Submitting...' : 'Submit Inquiry'}
                  </Button>
                </div>
              </form>
            )}

            {step === 4 && submissionResult && (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white">Thank You, {submissionResult.contactName}!</h2>
                <p className="text-gray-400 mt-2 mb-6">Your inquiry has been received. We'll be in touch shortly.</p>
                
                <Card className="bg-gray-800/50 border-gray-700 text-left">
                  <CardHeader>
                    <CardTitle className="text-white">What's Next?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                      <div>
                        <h4 className="text-white font-medium">Automated Recommendations</h4>
                        <p className="text-gray-400 text-sm">You'll receive an email with personalized sponsorship package recommendations within 5 minutes.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                      <div>
                        <h4 className="text-white font-medium">Discovery Call</h4>
                        <p className="text-gray-400 text-sm">A sponsorship manager will reach out to schedule a discovery call to discuss your goals.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                      <div>
                        <h4 className="text-white font-medium">Customized Proposal</h4>
                        <p className="text-gray-400 text-sm">Following our call, you'll receive a detailed proposal with ROI projections.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={() => navigate('/events')} className="mt-8">
                  Explore Events
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
