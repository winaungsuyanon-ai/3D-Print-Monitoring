create table processes (
  id text primary key,
  name text not null,
  description text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);

create table process_sets (
  id text primary key,
  process_id text references processes(id) on delete cascade,
  name text not null,
  description text default '',
  image_url text,
  file_3mf_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table bom_parts (
  id text primary key,
  set_id text references process_sets(id) on delete cascade,
  name text not null,
  material text default 'PLA+',
  color text default '#a1a1aa',
  time_per_piece int default 0,
  weight_per_piece numeric(10,2) default 0,
  default_qty int default 1,
  stl_url text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table components (
  id text primary key,
  set_id text references process_sets(id) on delete cascade,
  name text not null,
  spec text default '',
  qty int default 1,
  created_at timestamptz default now()
);

create table print_jobs (
  id bigint generated always as identity primary key,
  file_name text not null,
  quantity int default 1,
  time_per_piece int default 0,
  weight numeric(10,2) default 0,
  material text default 'PLA+',
  status text default 'Waiting',
  total_time int default 0,
  created_at timestamptz default now()
);

create table filaments (
  id text primary key,
  brand text not null,
  color_name text not null,
  hex_code text default '#ffffff',
  material text default 'PLA+',
  quantity int default 1,
  is_opened boolean default false,
  image_url text,
  created_at timestamptz default now()
);

create table machines (
  id text primary key,
  brand text not null,
  model text not null,
  spec_link text default '',
  image_url text default '',
  has_ams boolean default false,
  ams_model text default '',
  ams_image_url text default '',
  ams_slots jsonb default '[]',
  external_spool text,
  build_volume jsonb default '{}',
  nozzles text[] default '{}',
  created_at timestamptz default now()
);

alter table processes disable row level security;
alter table process_sets disable row level security;
alter table bom_parts disable row level security;
alter table components disable row level security;
alter table print_jobs disable row level security;
alter table filaments disable row level security;
alter table machines disable row level security;
