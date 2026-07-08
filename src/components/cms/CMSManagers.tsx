// Barrel file — re-exports the CMS manager components (each now lives in its own
// file under ./managers) and the shared UI helpers/constants (./shared) so existing
// imports elsewhere in the codebase keep working unchanged.

export { HeroBgManager } from './managers/HeroBgManager';
export { ShowcaseManager } from './managers/ShowcaseManager';
export { ComparisonsManager } from './managers/ComparisonsManager';
export { TestimonialsManager } from './managers/TestimonialsManager';
export { PackagesManager } from './managers/PackagesManager';
export { FaqsManager } from './managers/FaqsManager';
export { BlogManager } from './managers/BlogManager';
export { CaseStudiesManager } from './managers/CaseStudiesManager';
export { TimelineManager } from './managers/TimelineManager';
export { GearManager } from './managers/GearManager';

export {
  GridSkeleton,
  EmptyState,
  DeleteConfirm,
  ModalForm,
  FormInput,
  TabButton,
  toSlug,
  CAT_META,
  ICON_LIST,
  resolveIconCMS,
  type FireToast,
} from './shared';
