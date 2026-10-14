// client/src/test/attachmentPreviewsAndStartDate.test.jsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AttachmentsSection from '../components/Card/AttachmentsSection';
import Lightbox, { detectAttachmentType } from '../components/shared/Lightbox';
import Card from '../components/Board/Card';

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'admin' }
  })
}));

// Mock usePermissions
vi.mock('../context/PermissionContext', () => ({
  usePermissions: () => ({
    hasPermission: () => true
  })
}));

describe('Attachment Previews & Start Date Verification', () => {
  describe('File Type Detection', () => {
    it('correctly categorizes all required document and data formats', () => {
      expect(detectAttachmentType('/files/q3.xlsx', '', 'q3.xlsx')).toBe('excel');
      expect(detectAttachmentType('/files/data.xls', '', 'data.xls')).toBe('excel');
      expect(detectAttachmentType('/files/customers.csv', 'text/csv', 'customers.csv')).toBe('csv');
      expect(detectAttachmentType('/files/metrics.tsv', '', 'metrics.tsv')).toBe('csv');
      expect(detectAttachmentType('/files/config.json', 'application/json', 'config.json')).toBe('json');
      expect(detectAttachmentType('/files/report.docx', '', 'report.docx')).toBe('docx');
      expect(detectAttachmentType('/files/spec.pdf', 'application/pdf', 'spec.pdf')).toBe('pdf');
      expect(detectAttachmentType('/files/script.py', 'text/plain', 'script.py')).toBe('text');
      expect(detectAttachmentType('/files/image.png', 'image/png', 'image.png')).toBe('image');
      expect(detectAttachmentType('/files/recording.mp4', 'video/mp4', 'recording.mp4')).toBe('video');
      expect(detectAttachmentType('/files/podcast.mp3', 'audio/mpeg', 'podcast.mp3')).toBe('audio');
      expect(detectAttachmentType('/files/bundle.zip', 'application/zip', 'bundle.zip')).toBe('archive');
      expect(detectAttachmentType('/files/unknown.xyz', '', 'unknown.xyz')).toBe('generic');
    });
  });

  describe('AttachmentsSection Component', () => {
    const mockAttachments = [
      {
        id: 1,
        card_id: 10,
        file_name: 'Financials_Q4.xlsx',
        file_url: '/api/files/1/cards/10/fin.xlsx',
        file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        file_size_bytes: 45000,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        card_id: 10,
        file_name: 'payload.json',
        file_url: '/api/files/1/cards/10/payload.json',
        file_type: 'application/json',
        file_size_bytes: 1200,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        card_id: 10,
        file_name: 'contract.pdf',
        file_url: '/api/files/1/cards/10/contract.pdf',
        file_type: 'application/pdf',
        file_size_bytes: 98000,
        created_at: new Date().toISOString()
      }
    ];

    it('renders all attachment items with specific format badges and NO open-in-new-window button', () => {
      render(
        <AttachmentsSection
          attachments={mockAttachments}
          onDeleteAttachment={vi.fn()}
        />
      );

      // Verify header and attachment names
      expect(screen.getByText('Attachments (3)')).toBeInTheDocument();
      expect(screen.getByText('Financials_Q4.xlsx')).toBeInTheDocument();
      expect(screen.getByText('payload.json')).toBeInTheDocument();
      expect(screen.getByText('contract.pdf')).toBeInTheDocument();

      // Verify format badges exist on thumbnails
      expect(screen.getByText('XLSX')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();

      // Verify NO "open in new tab / window" external links exist
      const externalLink = screen.queryByTitle(/open in new/i);
      expect(externalLink).toBeNull();

      // Verify download buttons exist for attachments
      const downloadButtons = screen.getAllByTitle(/download file/i);
      expect(downloadButtons.length).toBe(3);
    });

    it('opens Universal Preview Modal on clicking thumbnail or attachment name', async () => {
      render(
        <AttachmentsSection
          attachments={mockAttachments}
          onDeleteAttachment={vi.fn()}
        />
      );

      // Click on JSON attachment name
      fireEvent.click(screen.getByText('payload.json'));

      // Universal preview modal dialog should be mounted
      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Verify modal header has Download button and NO open-in-new-window button
      const modalDownloadButton = within(modal).getByRole('button', { name: /download/i });
      expect(modalDownloadButton).toBeInTheDocument();

      const openInNewTab = screen.queryByTitle(/open in new tab/i);
      expect(openInNewTab).toBeNull();
    });
  });

  describe('Card Start Date Display', () => {
    it('displays start date badge on card face when start_date is set', () => {
      const cardWithStartDate = {
        id: 101,
        title: 'Complete System Migration',
        start_date: new Date('2026-09-09T00:00:00Z').toISOString(),
        due_date: null,
        is_complete: false,
        labels: [],
        members: []
      };

      render(
        <Card
          card={cardWithStartDate}
          index={0}
          listId={1}
          boardLabels={[]}
          boardMembers={[]}
        />
      );

      // Date badge should display formatted short start date
      expect(screen.getByText(/9 Sep/i)).toBeInTheDocument();
      expect(screen.getByTitle(/start/i)).toBeInTheDocument();
    });

    it('displays start and due date range when both are set on card', () => {
      const cardWithRange = {
        id: 102,
        title: 'Sprint Planning',
        start_date: new Date('2026-09-09T00:00:00Z').toISOString(),
        due_date: new Date('2026-09-15T00:00:00Z').toISOString(),
        is_complete: false,
        labels: [],
        members: []
      };

      render(
        <Card
          card={cardWithRange}
          index={0}
          listId={1}
          boardLabels={[]}
          boardMembers={[]}
        />
      );

      // Verify both start and due date are rendered together
      expect(screen.getByText(/9 Sep - 15 Sep/i)).toBeInTheDocument();
    });
  });
});
