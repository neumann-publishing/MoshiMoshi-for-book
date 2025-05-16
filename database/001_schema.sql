create table users(
  id serial primary key,
  email varchar(50) unique not null,
  password_digest varchar(200) not null,
  name varchar(20) not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index users_email_index on users(email);

create table user_settings(
  user_id integer primary key,
  enable_video boolean not null default true,
  enable_microphone boolean not null default true,
  enable_speaker boolean not null default true,
  enable_noise_cancellation boolean not null default true,
  microphone_under_gain integer not null default 10,
  current_audio_device_id varchar(255),
  current_video_device_id varchar(255),
  current_speaker_device_id varchar(255),
  enable_background_blur boolean not null default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  foreign key(user_id) references users(id)
);

create table meetings(
  uuid uuid primary key,
  name varchar(255) not null,
  finished_at timestamp,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table participants(
  user_id integer not null,
  meeting_uuid uuid not null,
  is_owner boolean not null default false,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  primary key(user_id, meeting_uuid),
  foreign key(user_id) references users(id),
  foreign key(meeting_uuid) references meetings(uuid)
);

create index participants_is_owner_index on participants(is_owner);
