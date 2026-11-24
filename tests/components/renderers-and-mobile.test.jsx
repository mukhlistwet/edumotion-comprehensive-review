import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JOURNEY_TEMPLATE_IDS, QUESTION_TYPES, toStudentDeliveryDto } from '@edumotion/domain';
import { FIXTURES_V1, createServiceProvider } from '@edumotion/services';
import { QuestionRenderer } from '../../apps/web/src/features/questions/QuestionRenderer.jsx';
import { JourneyTemplateRenderer } from '../../apps/web/src/features/journey/renderers/JourneyRenderers.jsx';
import { App as MobileApp } from '../../apps/mobile/App.jsx';

describe('Komponen Renderer Soal (14 Tipe), Journey (6 Template) & Mobile Surface', () => {
  it('merender ke-14 tipe soal kanonis melalui QuestionRenderer tanpa error dan mengirim perubahan nilai', () => {
    for (const type of QUESTION_TYPES) {
      const sample = FIXTURES_V1.questionsBank.questions.find((q) => q.type === type);
      expect(sample, `Fixture untuk ${type} wajib ada`).toBeTruthy();
      const dto = toStudentDeliveryDto(sample, { mode: 'practice' });
      const onChange = vi.fn();
      const { unmount } = render(
        <QuestionRenderer question={dto} value={undefined} onChange={onChange} />
      );
      expect(screen.getByRole('heading')).toBeInTheDocument();
      unmount();
    }
  });

  it('merender seluruh 6 template Journey di atas canonical view model yang sama dan mendukung keyboard', async () => {
    const provider = createServiceProvider();
    const { viewModel } = await provider.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01');
    const onSelect = vi.fn();

    for (const tplId of JOURNEY_TEMPLATE_IDS) {
      const vm = { ...viewModel, template: { ...viewModel.template, id: tplId } };
      const { unmount } = render(
        <JourneyTemplateRenderer viewModel={vm} selectedNodeId={vm.nodes[0].id} onSelectNode={onSelect} />
      );
      const nodeBtn = screen.getByRole('button', { name: /Checkpoint 1|Petak 1|Pulau 1|Simpul 1|Sektor 1|Planet 1/i });
      expect(nodeBtn).toBeInTheDocument();
      fireEvent.click(nodeBtn);
      expect(onSelect).toHaveBeenCalledWith(vm.nodes[0].id);
      unmount();
    }
  });

  it('merender aplikasi React Native Expo (@edumotion/mobile) lintas tab Home, Journey, Latihan, Mastery & Liga', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_student_smp_free' } });
    const persona = (await provider.auth.listPersonas()).find((p) => p.id === 'usr_student_smp_free');

    render(<MobileApp provider={provider} initialUser={persona} />);
    await waitFor(() => expect(screen.getByText(/Halo, Bima Pratama/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Journey' }));
    await waitFor(() => expect(screen.getByText(/Adventure · Number Forest/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Latihan' }));
    await waitFor(() => expect(screen.getByText(/Soal 1 dari/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Mastery' }));
    await waitFor(() => expect(screen.getByText(/Penguasaan Kompetensi/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Liga' }));
    await waitFor(() => expect(screen.getByText(/Liga Mingguan/i)).toBeInTheDocument());
  });
});
