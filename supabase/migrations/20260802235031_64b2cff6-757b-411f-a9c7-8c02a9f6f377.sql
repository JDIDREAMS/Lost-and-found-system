
-- enums
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.item_type AS ENUM ('lost','found');
CREATE TYPE public.item_status AS ENUM ('open','claimed','resolved');
CREATE TYPE public.claim_status AS ENUM ('pending','approved','rejected');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Member',
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users manage own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- items
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  item_type public.item_type NOT NULL,
  location text NOT NULL DEFAULT '',
  date_occurred date NOT NULL DEFAULT current_date,
  image_url text,
  status public.item_status NOT NULL DEFAULT 'open',
  contact_info text,
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  poster_name text NOT NULL DEFAULT 'Community member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items public read" ON public.items FOR SELECT USING (true);
CREATE POLICY "users post items" ON public.items FOR INSERT TO authenticated WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "owners or admins update items" ON public.items FOR UPDATE TO authenticated USING (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "owners or admins delete items" ON public.items FOR DELETE TO authenticated USING (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin'));

-- claims
CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  claimant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  status public.claim_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, claimant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_claim_participant(_claim_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.claims c JOIN public.items i ON i.id = c.item_id
    WHERE c.id = _claim_id AND (c.claimant_id = _user_id OR i.posted_by = _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.item_owner(_item_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT posted_by FROM public.items WHERE id = _item_id
$$;

CREATE POLICY "claims visible to participants" ON public.claims FOR SELECT TO authenticated
  USING (claimant_id = auth.uid() OR public.item_owner(item_id) = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users create own claims" ON public.claims FOR INSERT TO authenticated WITH CHECK (claimant_id = auth.uid());
CREATE POLICY "item owner updates claims" ON public.claims FOR UPDATE TO authenticated
  USING (public.item_owner(item_id) = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.item_owner(item_id) = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "claimant or admin deletes claim" ON public.claims FOR DELETE TO authenticated
  USING (claimant_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_claim_participant(claim_id, auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_claim_participant(claim_id, auth.uid()));
CREATE POLICY "participants mark read" ON public.messages FOR UPDATE TO authenticated
  USING (public.is_claim_participant(claim_id, auth.uid()))
  WITH CHECK (public.is_claim_participant(claim_id, auth.uid()));

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER items_touch BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- notification triggers
CREATE OR REPLACE FUNCTION public.notify_on_claim()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid; item_title text; claimant text;
BEGIN
  SELECT posted_by, title INTO owner_id, item_title FROM public.items WHERE id = NEW.item_id;
  SELECT display_name INTO claimant FROM public.profiles WHERE id = NEW.claimant_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.claimant_id THEN
    INSERT INTO public.notifications (user_id, text, link)
    VALUES (owner_id, COALESCE(claimant,'Someone') || ' submitted a claim on "' || item_title || '"', '/claims/' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER claims_notify AFTER INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.notify_on_claim();

CREATE OR REPLACE FUNCTION public.notify_on_claim_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item_title text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT title INTO item_title FROM public.items WHERE id = NEW.item_id;
    INSERT INTO public.notifications (user_id, text, link)
    VALUES (NEW.claimant_id, 'Your claim on "' || item_title || '" was ' || NEW.status || '.', '/claims/' || NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER claims_status_notify AFTER UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.notify_on_claim_status();

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; owner_id uuid; claimant_id uuid; sender_name text;
BEGIN
  SELECT c.claimant_id, i.posted_by INTO claimant_id, owner_id
  FROM public.claims c JOIN public.items i ON i.id = c.item_id WHERE c.id = NEW.claim_id;
  recipient := CASE WHEN NEW.sender_id = claimant_id THEN owner_id ELSE claimant_id END;
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF recipient IS NOT NULL AND recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, text, link)
    VALUES (recipient, 'New message from ' || COALESCE(sender_name,'a member'), '/claims/' || NEW.claim_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- storage policies
CREATE POLICY "item images public read" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "authenticated upload item images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'item-images');
CREATE POLICY "owners update item images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'item-images' AND owner = auth.uid());
CREATE POLICY "owners delete item images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'item-images' AND owner = auth.uid());

-- demo data
INSERT INTO public.items (title, description, category, item_type, location, date_occurred, status, poster_name, contact_info) VALUES
('Black leather wallet','Slim bifold wallet with a student ID inside and a few loyalty cards. No cash.','Wallets','found','Central Library, 2nd floor','2026-07-28','open','Priya N.','priya@example.com'),
('Silver MacBook Air 13"','Laptop in a navy sleeve with a sticker of a mountain on the lid. Password protected.','Electronics','lost','Bus route 14, near City Square','2026-07-30','open','Arun K.','arun@example.com'),
('Set of house keys','Three keys on a red carabiner with a small bottle-opener charm.','Keys','found','Riverside Park, near the fountain','2026-08-01','open','Maya R.','maya@example.com'),
('Golden retriever, collar "Biscuit"','Friendly dog, wearing a brown collar with the name Biscuit. Very calm.','Pets','found','Elm Street playground','2026-07-31','claimed','Daniel O.','daniel@example.com'),
('Blue Jansport backpack','Contains textbooks and a scientific calculator. Small tear on the left strap.','Bags','lost','Engineering Block, Room 204','2026-07-26','open','Sofia M.','sofia@example.com'),
('Gold hoop earring','Single small gold hoop, sentimental value. Reward offered.','Jewellery','lost','Metro station platform 3','2026-07-22','open','Hana T.','hana@example.com'),
('Prescription glasses, tortoise frame','Found on a bench, in a soft grey case.','Accessories','found','Botanical Gardens main path','2026-07-20','resolved','Ken A.','ken@example.com'),
('Water bottle with stickers','Green insulated bottle covered in travel stickers.','Other','found','Gym locker room','2026-08-02','open','Ravi S.','ravi@example.com'),
('iPhone 14, cracked corner','Black case, lock screen shows a photo of a beach.','Electronics','lost','Coffee shop on 5th Ave','2026-07-29','open','Lena B.','lena@example.com'),
('Umbrella, navy with wooden handle','Left behind after the rain on Tuesday.','Accessories','found','Lecture Hall C','2026-07-27','open','Tom W.','tom@example.com');
