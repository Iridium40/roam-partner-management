import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarContent, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Crown,
  Shield,
  User,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Loader2,
  Info,
  Trash2
} from 'lucide-react';
import type { ProviderRole, ProviderVerificationStatus } from '@/lib/database.types';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  provider_role: ProviderRole;
  bio?: string;
  experience_years?: number;
  verification_status: ProviderVerificationStatus;
  is_active: boolean;
}

interface StaffManagementSetupProps {
  businessId: string;
  userId: string;
  businessType?: 'independent' | 'business';
  onComplete: (data: StaffMember[]) => void;
  onBack?: () => void;
  initialData?: StaffMember[];
  className?: string;
}

const roleOptions = [
  {
    value: "provider" as ProviderRole,
    label: "Provider",
    description: "Delivers services to customers",
    icon: User,
  },
  {
    value: "dispatcher" as ProviderRole,
    label: "Dispatcher",
    description: "Manages bookings and schedules",
    icon: Shield,
  },
  {
    value: "owner" as ProviderRole,
    label: "Owner",
    description: "Full business access and control",
    icon: Crown,
  },
];

export default function StaffManagementSetup({
  businessId,
  userId,
  businessType = 'business',
  onComplete,
  onBack,
  initialData,
  className = ""
}: StaffManagementSetupProps) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffMember, setNewStaffMember] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    provider_role: 'provider' as ProviderRole,
    bio: '',
    experience_years: 0,
  });

  const addStaffMember = () => {
    if (!newStaffMember.first_name || !newStaffMember.last_name || !newStaffMember.email) {
      setError('Please fill in all required fields');
      return;
    }

    const staffMember: StaffMember = {
      id: Date.now().toString(),
      ...newStaffMember,
      verification_status: 'pending',
      is_active: true,
    };

    setStaffMembers(prev => [...prev, staffMember]);
    setNewStaffMember({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      provider_role: 'provider',
      bio: '',
      experience_years: 0,
    });
    setShowAddStaffModal(false);
    setError(null);
  };

  const removeStaffMember = (id: string) => {
    setStaffMembers(prev => prev.filter(staff => staff.id !== id));
  };

  const completionPercentage = () => {
    // Consider complete if at least one staff member is added (besides the owner)
    const hasStaffMembers = staffMembers.length > 0;
    return hasStaffMembers ? 100 : 0;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save staff management data to database
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId,
          step: 'staff_management',
          data: staffMembers,
          completed: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save staff management data');
      }

      // Call the onComplete callback
      onComplete(staffMembers);
    } catch (error) {
      console.error('Error saving staff management data:', error);
      setError(error instanceof Error ? error.message : 'Failed to save staff management data');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return completionPercentage() === 100;
  };

  // If business type is independent, skip staff management
  if (businessType === 'independent') {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-600">Staff Management</CardTitle>
                <p className="text-foreground/70">
                  Not required for independent businesses
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <Users className="w-16 h-16 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold text-gray-600">Independent Business</h3>
              <p className="text-gray-500">
                Staff management is not required for independent businesses. 
                You can proceed to the next step.
              </p>
              <Button 
                onClick={() => onComplete([])} 
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Continue to Next Step
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Staff Management
              </CardTitle>
              <p className="text-foreground/70">
                Add team members and set their roles and permissions
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{completionPercentage()}% Complete</span>
            </div>
            <Progress value={completionPercentage()} className="w-full" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Staff Members List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Team Members</Label>
              <Dialog open={showAddStaffModal} onOpenChange={setShowAddStaffModal}>
                <DialogTrigger asChild>
                  <Button className="bg-roam-blue hover:bg-roam-blue/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Team Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Add a new team member to your business. They will receive an invitation to join.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={newStaffMember.first_name}
                          onChange={(e) => setNewStaffMember(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={newStaffMember.last_name}
                          onChange={(e) => setNewStaffMember(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newStaffMember.email}
                        onChange={(e) => setNewStaffMember(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={newStaffMember.phone}
                        onChange={(e) => setNewStaffMember(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={newStaffMember.provider_role}
                        onValueChange={(value: ProviderRole) => setNewStaffMember(prev => ({ ...prev, provider_role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <role.icon className="w-4 h-4" />
                                {role.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={newStaffMember.bio}
                        onChange={(e) => setNewStaffMember(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Brief description of their experience and skills..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        value={newStaffMember.experience_years}
                        onChange={(e) => setNewStaffMember(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddStaffModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addStaffMember} className="bg-roam-blue hover:bg-roam-blue/90">
                      Add Member
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {staffMembers.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members Yet</h3>
                <p className="text-gray-600 mb-4">
                  Add your first team member to get started. You can always add more later.
                </p>
                <Button onClick={() => setShowAddStaffModal(true)} className="bg-roam-blue hover:bg-roam-blue/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Team Member
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {staffMembers.map((staff) => (
                  <Card key={staff.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {staff.first_name[0]}{staff.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">
                            {staff.first_name} {staff.last_name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {staff.email}
                          </div>
                          {staff.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {staff.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {roleOptions.find(r => r.value === staff.provider_role)?.label}
                        </Badge>
                        <Badge className={staff.verification_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                          {staff.verification_status === 'approved' ? (
                            <>
                              <UserCheck className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStaffMember(staff.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Team members will receive an email invitation to join your business. 
              You can manage their roles and permissions from your dashboard after setup.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={loading || !canSubmit()}
              className="bg-roam-blue hover:bg-roam-blue/90 ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Banking & Payouts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
