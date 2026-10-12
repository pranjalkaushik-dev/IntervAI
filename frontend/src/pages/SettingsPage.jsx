import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import {
  Settings,
  User,
  Video,
  Mic,
  Shield,
  Bell,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 font-display">
          Account & Device Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure profile details, audio/video devices, and assessment preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Personal Profile</span>
            </div>
            <div className="text-xs text-slate-500">Account identification across interview sessions</div>
          </CardHeader>

          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                defaultValue={user?.fullName || ''}
              />
              <Input
                label="Email Address"
                defaultValue={user?.email || ''}
                disabled
                helperText="Email is permanently assigned to your account"
              />
            </div>

            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-slate-700 font-medium">Assigned Role:</span>
              <Badge variant="blue" size="sm">
                {user?.accountRole || 'STUDENT'}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Media Devices */}
        <Card>
          <CardHeader>
            <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600" />
              <span>Camera & Audio Hardware</span>
            </div>
            <div className="text-xs text-slate-500">Default devices for WebRTC room media streaming</div>
          </CardHeader>

          <CardBody className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Primary Video Camera
                </label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:bg-white focus:border-blue-500 focus:outline-none">
                  <option>Integrated Webcam (HD 1080p)</option>
                  <option>Virtual Camera / External USB</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Microphone Input
                </label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:bg-white focus:border-blue-500 focus:outline-none">
                  <option>Default Microphone Array</option>
                  <option>Headset Microphone</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings updated successfully!
            </span>
          ) : (
            <div />
          )}

          <Button type="submit" size="md">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
