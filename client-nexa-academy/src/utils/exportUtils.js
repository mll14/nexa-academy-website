// src/utils/exportUtils.js
export const exportApplicationsToCSV = (applications) => {
  return new Promise((resolve, reject) => {
    try {
      // CSV headers
      const headers = [
        'Application ID',
        'Full Name',
        'Email',
        'Phone',
        'Program',
        'Program Name',
        'Status',
        'Estimated Fees (KSh)',
        'Payment Plan',
        'Applied Date',
        'Start Date',
        'Last Updated',
        'Admin Notes',
        'Email Sent',
        'Source'
      ];

      // Convert applications to CSV rows
      const rows = applications.map(app => {
        // Format dates properly
        const appliedDate = app.appliedAt
          ? (typeof app.appliedAt === 'object' && app.appliedAt.seconds
              ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString()
              : new Date(app.appliedAt).toLocaleDateString())
          : (app.timestamp
              ? new Date(app.timestamp).toLocaleDateString()
              : 'N/A');

        const startDate = app.startDate
          ? (typeof app.startDate === 'string'
              ? new Date(app.startDate).toLocaleDateString()
              : app.startDate.toLocaleDateString
                ? app.startDate.toLocaleDateString()
                : app.startDate)
          : 'Not specified';

        const updatedDate = app.updatedAt
          ? (typeof app.updatedAt === 'object' && app.updatedAt.seconds
              ? new Date(app.updatedAt.seconds * 1000).toLocaleDateString()
              : new Date(app.updatedAt).toLocaleDateString())
          : 'N/A';

        // Get Program name
        const ProgramName = app.Program === 'fullstack' ? 'Software Engineering' :
              app.Program === 'cloud' ? 'Cloud Computing and AI' :
                          app.Program === 'frontend' ? 'Frontend Development' :
                          app.Program === 'networking' ? 'Networking & Security' :
                          app.Program === 'mobile' ? 'Mobile App Development' :
                          app.ProgramName || app.Program || '';

        return [
          app.id || 'N/A',
          `"${app.fullName || ''}"`,
          app.email || '',
          app.phone || '',
          app.Program || '',
          `"${ProgramName}"`,
          app.status || 'pending',
          app.estimatedFees || 0,
          app.paymentPlan || 'Not specified',
          appliedDate,
          startDate,
          updatedDate,
          `"${app.adminNotes || ''}"`,
          app.emailSent ? 'Yes' : 'No',
          app.source || 'website'
        ];
      });

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create Blob for download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      resolve({
        success: true,
        csvData: csvContent,
        downloadUrl: url,
        fileName: `applications_export_${new Date().toISOString().split('T')[0]}.csv`,
        count: applications.length
      });
    } catch (error) {
      reject(error);
    }
  });
};