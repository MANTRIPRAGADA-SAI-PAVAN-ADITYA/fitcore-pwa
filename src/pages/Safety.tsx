import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Phone, ShieldAlert } from "lucide-react";
import { getSettings, updateEmergencyContact } from "@/services/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, HelpText } from "@/components/ui/Input";
import { MedicationDisclaimer } from "@/components/MedicationDisclaimer";

export function Safety() {
  const settings = useLiveQuery(() => getSettings(), []);
  const [editing, setEditing] = useState(false);

  if (!settings) return null;
  const c = settings.emergencyContact;

  return (
    <div className="space-y-4 pb-4">
      <Card className="border-urgent bg-urgent-soft">
        <CardContent className="flex items-start gap-3 pt-5">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-urgent" aria-hidden="true" />
          <div className="space-y-2 text-sm text-text">
            <p className="font-semibold">When to seek urgent care</p>
            <p>
              If you have severe symptoms, symptoms that are rapidly worsening, or believe you may be experiencing a
              medical emergency, seek urgent medical attention or contact your local emergency service immediately.
            </p>
            <p>This app cannot diagnose your condition. When in doubt, contact a healthcare professional.</p>
          </div>
        </CardContent>
      </Card>

      <MedicationDisclaimer />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Emergency contacts</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </CardHeader>
        <CardContent>
          {editing ? (
            <EditEmergencyContacts
              initial={c}
              onSaved={() => setEditing(false)}
            />
          ) : (
            <div className="space-y-3">
              <ContactRow label="Emergency number" value={c.emergencyNumber} />
              <ContactRow label="Doctor" value={c.doctorName} phone={c.doctorPhone} />
              <ContactRow label="Clinic" value={c.clinicName} phone={c.clinicPhone} />
              <ContactRow label="Hospital" value={c.hospitalName} phone={c.hospitalPhone} />
              {!c.emergencyNumber && !c.doctorName && !c.clinicName && !c.hospitalName && (
                <p className="text-sm text-text-muted">
                  No contacts saved yet. Add your doctor, clinic, or local emergency number so they&rsquo;re on hand
                  when you need them.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContactRow({ label, value, phone }: { label: string; value?: string; phone?: string }) {
  if (!value && !phone) return null;
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="focus-ring flex items-center gap-1 rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
          <Phone className="h-3.5 w-3.5" /> {phone}
        </a>
      )}
    </div>
  );
}

function EditEmergencyContacts({
  initial,
  onSaved,
}: {
  initial: import("@/types/models").EmergencyContact;
  onSaved: () => void;
}) {
  const [emergencyNumber, setEmergencyNumber] = useState(initial.emergencyNumber ?? "");
  const [doctorName, setDoctorName] = useState(initial.doctorName ?? "");
  const [doctorPhone, setDoctorPhone] = useState(initial.doctorPhone ?? "");
  const [clinicName, setClinicName] = useState(initial.clinicName ?? "");
  const [clinicPhone, setClinicPhone] = useState(initial.clinicPhone ?? "");
  const [hospitalName, setHospitalName] = useState(initial.hospitalName ?? "");
  const [hospitalPhone, setHospitalPhone] = useState(initial.hospitalPhone ?? "");

  return (
    <div className="space-y-3">
      <HelpText>
        For India, you can use 112 for general emergencies. Add your own doctor, clinic, and hospital details below.
      </HelpText>
      <div>
        <Label htmlFor="e-emergency">Emergency number</Label>
        <Input id="e-emergency" value={emergencyNumber} onChange={(e) => setEmergencyNumber(e.target.value)} placeholder="e.g. 112" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="e-doctor">Doctor name</Label>
          <Input id="e-doctor" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="e-doctor-phone">Doctor phone</Label>
          <Input id="e-doctor-phone" value={doctorPhone} onChange={(e) => setDoctorPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="e-clinic">Clinic name</Label>
          <Input id="e-clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="e-clinic-phone">Clinic phone</Label>
          <Input id="e-clinic-phone" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="e-hospital">Hospital name</Label>
          <Input id="e-hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="e-hospital-phone">Hospital phone</Label>
          <Input id="e-hospital-phone" value={hospitalPhone} onChange={(e) => setHospitalPhone(e.target.value)} />
        </div>
      </div>
      <Button
        className="w-full"
        onClick={async () => {
          await updateEmergencyContact({
            emergencyNumber: emergencyNumber.trim() || undefined,
            doctorName: doctorName.trim() || undefined,
            doctorPhone: doctorPhone.trim() || undefined,
            clinicName: clinicName.trim() || undefined,
            clinicPhone: clinicPhone.trim() || undefined,
            hospitalName: hospitalName.trim() || undefined,
            hospitalPhone: hospitalPhone.trim() || undefined,
          });
          onSaved();
        }}
      >
        Save contacts
      </Button>
    </div>
  );
}
