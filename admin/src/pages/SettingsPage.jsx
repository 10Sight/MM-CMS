import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  Phone,
  Briefcase,
  IdCard,
  Shield,
  User,
  Edit3,
  Calendar,
  Settings,
  UserCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/utils/axios";
import Loader from "@/components/ui/Loader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/v1/auth/me");
        setProfile(res.data.data.employee);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const getInitials = (name) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  };

  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'default';
      case 'supervisor': return 'secondary';
      case 'employee': return 'outline';
      default: return 'outline';
    }
  };

  const getDepartmentName = (dept) => {
    if (!dept) return 'Not assigned';
    if (Array.isArray(dept)) {
      if (dept.length === 0) return 'Not assigned';
      return dept.map(d => d.name || "Dept").join(", ");
    }
    if (typeof dept === 'string') return dept;
    if (typeof dept === 'object' && dept?.name) return dept.name;
    return 'Not assigned';
  };

  if (loading)
    return <Loader />;
  if (!profile)
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No profile found</p>
            <p className="text-sm text-muted-foreground mt-2">Unable to load your profile information</p>
          </CardContent>
        </Card>
      </div>
    );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24 ring-4 ring-blue-100">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                    {getInitials(profile.fullName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2">
                <Badge variant={getRoleBadgeVariant(profile.role)} className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IdCard className="h-4 w-4" />
                  <span>ID: {profile.employeeId}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{getDepartmentName(profile.department)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {currentUser?.role === "admin" && (
                <>
                  <Separator className="my-4" />
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/admin/employee/edit/${profile._id}`)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your account details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <ProfileItem
                  icon={<Mail className="h-5 w-5 text-blue-500" />}
                  label="Email Address"
                  value={profile.emailId}
                />
                <ProfileItem
                  icon={<Phone className="h-5 w-5 text-green-500" />}
                  label="Phone Number"
                  value={profile.phoneNumber || "Not provided"}
                />
                <ProfileItem
                  icon={<Briefcase className="h-5 w-5 text-purple-500" />}
                  label="Department"
                  value={getDepartmentName(profile.department)}
                />
                <ProfileItem
                  icon={<IdCard className="h-5 w-5 text-orange-500" />}
                  label="Auditor ID"
                  value={profile.employeeId}
                />
                <ProfileItem
                  icon={<Shield className="h-5 w-5 text-indigo-500" />}
                  label="Role & Permissions"
                  value={profile.role}
                  isRole={true}
                />
                <ProfileItem
                  icon={<Calendar className="h-5 w-5 text-gray-500" />}
                  label="Account Created"
                  value={new Date(profile.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ icon, label, value, isRole = false }) {
  const getRoleBadgeVariant = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'default';
      case 'supervisor': return 'secondary';
      case 'employee': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {label}
            </p>
            {isRole ? (
              <Badge variant={getRoleBadgeVariant(value)} className="capitalize">
                {value || "Not specified"}
              </Badge>
            ) : (
              <p className="text-base font-semibold text-foreground break-words">
                {value || "Not specified"}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
