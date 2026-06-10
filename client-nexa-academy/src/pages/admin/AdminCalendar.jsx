import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { CalendarView } from '@/components/admin/calendar/CalendarView';
import DetailDrawer from '@/components/admin/DetailDrawer';

export default function AdminCalendar() {
  const [appDrawerOpen, setAppDrawerOpen] = useState(false);
  const [activeAppId, setActiveAppId] = useState(null);
  const [intakeDrawerOpen, setIntakeDrawerOpen] = useState(false);
  const [activeIntakeId, setActiveIntakeId] = useState(null);

  const handleInterviewClick = (applicationId) => {
    setActiveAppId(applicationId);
    setAppDrawerOpen(true);
  };

  const handleIntakeClick = (intakeId) => {
    setActiveIntakeId(intakeId);
    setIntakeDrawerOpen(true);
  };

  return (
    <>
      <Card className="border rounded-2xl overflow-hidden" style={{ minHeight: 600 }}>
        <CalendarView
          onInterviewClick={handleInterviewClick}
          onIntakeClick={handleIntakeClick}
        />
      </Card>

      <DetailDrawer
        open={appDrawerOpen}
        onClose={() => { setAppDrawerOpen(false); setActiveAppId(null); }}
        itemId={activeAppId}
      />

      <DetailDrawer
        open={intakeDrawerOpen}
        onClose={() => { setIntakeDrawerOpen(false); setActiveIntakeId(null); }}
        mode="intake"
        intakeId={activeIntakeId}
      />
    </>
  );
}
