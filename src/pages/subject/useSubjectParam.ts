import { useParams } from 'react-router-dom';
import { getSubjectConfig, isSubject } from '../../config/subjects';
import type { SubjectConfig } from '../../types';

/** 从路由取科目并校验。地址栏乱填时返回 null，由页面决定跳回首页。 */
export function useSubjectParam(): SubjectConfig | null {
  const { subject } = useParams();
  if (!subject || !isSubject(subject)) return null;
  return getSubjectConfig(subject);
}
