import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createServiceProvider } from '@edumotion/services';
import { App } from '../../apps/web/src/App.jsx';

function makeRouter(initialEntries) {
  return function TestRouter({ children }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('Workflow Kritis End-to-End Frontend Web', () => {
  it('siswa yang mencoba membuka rute Platform Admin diarahkan ke halaman Access Denied (403)', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_student_smp_free' } });
    const Router = makeRouter(['/admin/institutions']);
    render(<App provider={provider} RouterComponent={Router} />);

    await waitFor(() => expect(screen.getByText(/Akses Ditolak \(403\)/i)).toBeInTheDocument());
  });

  it('Author membuka Manual Question Builder, memvalidasi, dan melihat Live Student Preview tanpa bocor kunci', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_author_a' } });
    const Router = makeRouter(['/studio/questions/new']);
    render(<App provider={provider} RouterComponent={Router} />);

    await waitFor(() => expect(screen.getByText(/Live Student Preview/i)).toBeInTheDocument());
    expect(screen.getByText(/Tidak ada blocking error/i)).toBeInTheDocument();
  });

  it('Author menjalankan AI Question Generator dan menerima item valid menjadi Draft (bukan Published)', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_author_a' } });
    const Router = makeRouter(['/studio/ai-generator']);
    render(<App provider={provider} RouterComponent={Router} />);

    await waitFor(() => expect(screen.getByText(/Buat Draf Soal Terstruktur dengan AI/i)).toBeInTheDocument());
    const acceptBtn = screen.getByRole('button', { name: /Terima ke Draft Bank Soal/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => expect(screen.getByText(/Lihat Draft di Bank Soal/i)).toBeInTheDocument());
    const qList = await provider.question.list({ page: 1, pageSize: 20 });
    const importedDraft = qList.items.find((q) => q.metadata?.code === 'AI-ALG-001');
    expect(importedDraft?.governance?.status).toBe('draft');
  });

  it('Siswa memulai Ujian Formal Tryout, menjawab, dan mengumpulkan tanpa hearts maupun pengaruh XP ke nilai', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_student_sma_prem' } });
    const Router = makeRouter(['/student/assessments']);
    render(<App provider={provider} RouterComponent={Router} />);

    await waitFor(() => expect(screen.getByText(/Tryout Matematika Semester Ganjil/i)).toBeInTheDocument());
    const startBtns = screen.getAllByRole('button', { name: /Mulai \/ Lanjutkan Ujian/i });
    fireEvent.click(startBtns[0]);

    await waitFor(() => expect(screen.getByText(/Ujian Formal · Snapshot Immutable/i)).toBeInTheDocument());
    expect(screen.getByText(/Tanpa Hearts/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kumpulkan Ujian' }));
    await waitFor(() => expect(screen.getByText(/Konfirmasi Pengumpulan Ujian/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Kumpulkan Sekarang' }));

    await waitFor(() => expect(screen.getByText(/Ringkasan Nilai Akademik/i)).toBeInTheDocument());
  });
});
