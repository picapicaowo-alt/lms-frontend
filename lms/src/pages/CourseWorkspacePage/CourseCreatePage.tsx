import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useMutation} from '@tanstack/react-query';
import styles from './CourseCreatePage.module.scss';
import {courseApiService} from '@/apis/services/course-api';
import {ApiError, unwrapData} from '@/apis';

interface FormState {
  courseCode: string;
  title: string;
  termStartDate: string;
  termEndDate: string;
  description: string;
  location: string;
}

const EMPTY: FormState = {
  courseCode: '',
  title: '',
  termStartDate: '',
  termEndDate: '',
  description: '',
  location: '',
};

/**
 * Creating a course.
 *
 * There is no create screen in the design. "New Content" leads to the empty
 * edit layout, which shows a course title, weeks and a schedule — but every
 * one of those hangs off a course id, and weeks, materials and sessions can
 * only be created once the course exists. So creation is its own step, and it
 * hands over to the edit screen as soon as the course is there.
 *
 * The design also has nowhere to enter term dates, and POST /v2/courses
 * rejects a course without them ("termStartDate is required"). They are asked
 * for here because a course cannot be created otherwise — see the note in
 * open-decisions.md.
 */
const CourseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);

  const create = useMutation({
    mutationFn: async () => unwrapData(
      await courseApiService.createCourse({
        courseCode: form.courseCode.trim(),
        title: form.title.trim(),
        termStartDate: form.termStartDate,
        termEndDate: form.termEndDate,
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
      }),
      'createCourse'
    ),
    // Straight into the new course so the next step — weeks, schedule — is
    // where the design expects it to be.
    onSuccess: (course) => navigate(`/course/${course.id}`),
  });

  const set = (field: keyof FormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({...form, [field]: event.target.value});

  const datesOutOfOrder = Boolean(
    form.termStartDate && form.termEndDate && form.termEndDate < form.termStartDate
  );

  const canSubmit = Boolean(
    form.courseCode.trim() && form.title.trim() && form.termStartDate && form.termEndDate
  ) && !datesOutOfOrder && !create.isPending;

  // The server reports why it refused; showing its message beats a generic
  // failure, since most refusals here are fixable input.
  const failure = create.isError
    ? ((create.error as unknown as ApiError)?.details as {message?: string} | undefined)?.message
      ?? "Couldn't create the course."
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={() => navigate('/course')}>
          ←
        </button>
        <h1 className={styles.title}>New course</h1>
      </header>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) create.mutate();
        }}
      >
        <label className={styles.field}>
          <span className={styles.label}>Course code</span>
          <input
            className={styles.input}
            value={form.courseCode}
            onChange={set('courseCode')}
            maxLength={32}
            placeholder="CS01"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Course title</span>
          <input
            className={styles.input}
            value={form.title}
            onChange={set('title')}
            placeholder="Computer programming - JavaScript and the web"
            required
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Term starts</span>
            <input
              className={styles.input}
              type="date"
              value={form.termStartDate}
              onChange={set('termStartDate')}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Term ends</span>
            <input
              className={styles.input}
              type="date"
              value={form.termEndDate}
              onChange={set('termEndDate')}
              required
            />
          </label>
        </div>

        {datesOutOfOrder && (
          <p className={styles.error}>The term must end on or after it starts.</p>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Location <span className={styles.optional}>optional</span></span>
          <input
            className={styles.input}
            value={form.location}
            onChange={set('location')}
            placeholder="Engineering Building"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Description <span className={styles.optional}>optional</span></span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={form.description}
            onChange={set('description')}
          />
        </label>

        {failure && <p className={styles.error} role="alert">{failure}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={() => navigate('/course')}>
            Cancel
          </button>
          <button type="submit" className={styles.submit} disabled={!canSubmit}>
            {create.isPending ? 'Creating…' : 'Create course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseCreatePage;
