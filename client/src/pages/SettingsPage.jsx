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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-2 border-b border-arena-border">
        <h1 className="text-xl font-bold text-white font-display">
          Account & Device Settings
        </h1>
        <p className="text-xs text-arena-muted mt-0.5">
          Configure profile details, audio/video devices, and assessment preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="font-semibold text-sm text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Personal Profile</span>
            </div>
            <div className="text-xs text-arena-muted">Account identification across interview sessions</div>
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
                helperText="Email is locked to your account"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-300 font-medium">Assigned Role:</span>
              <Badge variant="blue" size="xs">
                {user?.accountRole || 'STUDENT'}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Media Devices */}
        <Card>
          <CardHeader>
            <div className="font-semibold text-sm text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-400" />
              <span>Camera & Audio Hardware</span>
            </div>
            <div className="text-xs text-arena-muted">Default devices for WebRTC room media streaming</div>
          </CardHeader>

          <CardBody className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Primary Video Camera
                </label>
                <select className="w-full px-3 py-2 bg-arena-panel border border-arena-border rounded-md text-white text-xs">
                  <option>Integrated Webcam (HD 1080p)</option>
                  <option>Virtual Camera / External USB</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Microphone Input
                </label>
                <select className="w-full px-3 py-2 bg-arena-panel border border-arena-border rounded-md text-white text-xs">
                  <option>Default Microphone Array</option>
                  <option>Headset Microphone</option>
                </select>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4" />
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
