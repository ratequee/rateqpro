-- Private attachments bucket for RateQ Pro.
-- Run in the Supabase SQL editor if you prefer not to auto-create from the app.

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 10485760)
on conflict (id) do nothing;

-- No public policies: only the service role used by the Next.js server can read/write.
