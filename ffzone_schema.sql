--
-- PostgreSQL database dump
--

\restrict 8b4gf2n7en9SWEyAh6WNi9hZUKedNVh8Eu8DVkpdkkMYOhUuM6tz4y7nYUucsRn

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.account (
    id uuid NOT NULL,
    avatar_url character varying(255),
    created_at timestamp(6) without time zone,
    email character varying(150) NOT NULL,
    full_name character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    password_hash character varying(255),
    phone character varying(20),
    provider character varying(20) NOT NULL,
    provider_id character varying(255),
    role character varying(20) NOT NULL,
    updated_at timestamp(6) without time zone,
    date_of_birth date,
    gender character varying(10),
    CONSTRAINT account_gender_check CHECK (((gender)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT account_provider_check CHECK (((provider)::text = ANY ((ARRAY['LOCAL'::character varying, 'GOOGLE'::character varying])::text[]))),
    CONSTRAINT account_role_check CHECK (((role)::text = ANY ((ARRAY['USER'::character varying, 'STAFF'::character varying, 'OWNER'::character varying, 'IT_ADMIN'::character varying])::text[])))
);


ALTER TABLE public.account OWNER TO ffzone;

--
-- Name: booking_services; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.booking_services (
    id uuid NOT NULL,
    cancel_reason text,
    cancelled_at timestamp(6) without time zone,
    note text,
    quantity integer NOT NULL,
    total_price numeric(12,0) NOT NULL,
    unit_price numeric(12,0) NOT NULL,
    added_by uuid,
    booking_id uuid NOT NULL,
    service_id uuid NOT NULL
);


ALTER TABLE public.booking_services OWNER TO ffzone;

--
-- Name: booking_slots; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.booking_slots (
    id uuid NOT NULL,
    booked_price numeric(12,0) NOT NULL,
    created_at timestamp(6) without time zone,
    booking_id uuid NOT NULL,
    field_slot_id uuid NOT NULL
);


ALTER TABLE public.booking_slots OWNER TO ffzone;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.bookings (
    id uuid NOT NULL,
    booking_code character varying(30) NOT NULL,
    checkin_at timestamp(6) without time zone,
    checkout_at timestamp(6) without time zone,
    compensation_amount numeric(12,0) NOT NULL,
    created_at timestamp(6) without time zone,
    discount_amount numeric(12,0) NOT NULL,
    field_amount numeric(12,0) NOT NULL,
    note text,
    payment_deadline timestamp(6) without time zone,
    service_amount numeric(12,0) NOT NULL,
    status character varying(20) NOT NULL,
    total_amount numeric(12,0) NOT NULL,
    updated_at timestamp(6) without time zone,
    account_id uuid NOT NULL,
    field_id uuid NOT NULL,
    voucher_id uuid,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING_PAYMENT'::character varying, 'CONFIRMED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'REFUND_PENDING'::character varying, 'REFUNDED'::character varying])::text[])))
);


ALTER TABLE public.bookings OWNER TO ffzone;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.cart_items (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    quantity integer NOT NULL,
    cart_id uuid NOT NULL,
    service_id uuid NOT NULL
);


ALTER TABLE public.cart_items OWNER TO ffzone;

--
-- Name: carts; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.carts (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    updated_at timestamp(6) without time zone,
    account_id uuid NOT NULL
);


ALTER TABLE public.carts OWNER TO ffzone;

--
-- Name: field_images; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.field_images (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    image_url character varying(255) NOT NULL,
    is_thumbnail boolean NOT NULL,
    field_id uuid NOT NULL
);


ALTER TABLE public.field_images OWNER TO ffzone;

--
-- Name: field_pricing; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.field_pricing (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    day_of_week character varying(10) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    end_time time(6) without time zone NOT NULL,
    holiday_name character varying(100),
    is_active boolean NOT NULL,
    price numeric(12,0) NOT NULL,
    start_time time(6) without time zone NOT NULL,
    field_id uuid NOT NULL
);


ALTER TABLE public.field_pricing OWNER TO ffzone;

--
-- Name: field_slots; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.field_slots (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    end_time time(6) without time zone NOT NULL,
    price numeric(12,0) NOT NULL,
    slot_date date NOT NULL,
    start_time time(6) without time zone NOT NULL,
    status character varying(20) NOT NULL,
    updated_at timestamp(6) without time zone,
    version integer NOT NULL,
    field_id uuid NOT NULL,
    CONSTRAINT field_slots_status_check CHECK (((status)::text = ANY ((ARRAY['AVAILABLE'::character varying, 'PENDING'::character varying, 'OCCUPIED'::character varying])::text[])))
);


ALTER TABLE public.field_slots OWNER TO ffzone;

--
-- Name: fields; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.fields (
    id uuid NOT NULL,
    code character varying(20) NOT NULL,
    created_at timestamp(6) without time zone,
    description text,
    name character varying(100) NOT NULL,
    status character varying(20) NOT NULL,
    type character varying(20) NOT NULL,
    updated_at timestamp(6) without time zone,
    CONSTRAINT fields_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'MAINTENANCE'::character varying])::text[])))
);


ALTER TABLE public.fields OWNER TO ffzone;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.payments (
    id uuid NOT NULL,
    amount numeric(12,0) NOT NULL,
    created_at timestamp(6) without time zone,
    paid_at timestamp(6) without time zone,
    payment_method character varying(10) NOT NULL,
    status character varying(10) NOT NULL,
    vnp_response_code character varying(10),
    vnp_transaction_no character varying(100),
    vnp_txn_ref character varying(100),
    booking_id uuid NOT NULL,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PAID'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO ffzone;

--
-- Name: refunds; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.refunds (
    id uuid NOT NULL,
    cancel_type character varying(20) NOT NULL,
    note text,
    processed_at timestamp(6) without time zone,
    refund_amount numeric(12,0) NOT NULL,
    refund_percent integer NOT NULL,
    requested_at timestamp(6) without time zone,
    status character varying(10) NOT NULL,
    booking_id uuid NOT NULL,
    processed_by uuid,
    CONSTRAINT refunds_cancel_type_check CHECK (((cancel_type)::text = ANY ((ARRAY['USER_CANCEL'::character varying, 'STAFF_CANCEL'::character varying, 'MAINTENANCE'::character varying, 'SYSTEM_EXPIRE'::character varying])::text[]))),
    CONSTRAINT refunds_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'COMPLETED'::character varying])::text[])))
);


ALTER TABLE public.refunds OWNER TO ffzone;

--
-- Name: services; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.services (
    id uuid NOT NULL,
    created_at timestamp(6) without time zone,
    description text,
    image_url character varying(255),
    is_active boolean NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(12,0) NOT NULL,
    category character varying(20) NOT NULL,
    CONSTRAINT chk_service_category CHECK (((category)::text = ANY ((ARRAY['DRINK'::character varying, 'EQUIPMENT'::character varying, 'FACILITY'::character varying])::text[])))
);


ALTER TABLE public.services OWNER TO ffzone;

--
-- Name: user_vouchers; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.user_vouchers (
    id uuid NOT NULL,
    claimed_at timestamp(6) without time zone,
    is_used boolean NOT NULL,
    used_at timestamp(6) without time zone,
    account_id uuid NOT NULL,
    voucher_id uuid NOT NULL
);


ALTER TABLE public.user_vouchers OWNER TO ffzone;

--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: ffzone
--

CREATE TABLE public.vouchers (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    created_at timestamp(6) without time zone,
    discount_value numeric(12,0) NOT NULL,
    end_date timestamp(6) without time zone NOT NULL,
    quantity integer NOT NULL,
    start_date timestamp(6) without time zone NOT NULL,
    status character varying(10) NOT NULL,
    used_quantity integer NOT NULL,
    voucher_type character varying(10) NOT NULL,
    CONSTRAINT vouchers_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'INACTIVE'::character varying, 'EXPIRED'::character varying])::text[]))),
    CONSTRAINT vouchers_voucher_type_check CHECK (((voucher_type)::text = ANY ((ARRAY['PERCENT'::character varying, 'FIXED'::character varying])::text[])))
);


ALTER TABLE public.vouchers OWNER TO ffzone;

--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.account VALUES ('5d672dc9-5c07-4ed5-9863-f3d9189771ac', NULL, NULL, 'user@ffzone.vn', 'User Demo', true, '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', '0900000003', 'LOCAL', NULL, 'USER', NULL, NULL, NULL);
INSERT INTO public.account VALUES ('7a9c42b9-0f36-4d35-82b8-f5cb9c8af147', NULL, NULL, 'admin@ffzone.vn', 'IT Admin', true, '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', '0900000000', 'LOCAL', NULL, 'IT_ADMIN', '2026-06-23 10:18:17.242563', NULL, NULL);
INSERT INTO public.account VALUES ('14d8c5e4-d1ef-41cd-8ad1-5df77d5f9fc5', NULL, NULL, 'owner@ffzone.vn', 'Owner', true, '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', '0900000001', 'LOCAL', NULL, 'OWNER', '2026-06-23 17:33:13.394883', NULL, NULL);
INSERT INTO public.account VALUES ('0176c242-acea-465e-8772-4db4f5abdbac', NULL, NULL, 'staff@ffzone.vn', 'Staff 1', true, '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', '0900000002', 'LOCAL', NULL, 'STAFF', '2026-07-01 10:01:20.669312', NULL, NULL);


--
-- Data for Name: booking_services; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.booking_services VALUES ('c92cc48c-cc43-471b-9a6b-3545da076de3', NULL, NULL, NULL, 1, 50000, 50000, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', 'd702d6d1-a7ec-4d4e-aa92-6585ad0d288d', '4ff84af8-c3e2-4ac4-b2d5-c108efad20a7');
INSERT INTO public.booking_services VALUES ('77a0e75d-ed86-4b78-a0f3-1a6a1c768508', NULL, NULL, NULL, 1, 20000, 20000, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', 'd702d6d1-a7ec-4d4e-aa92-6585ad0d288d', 'ca084987-97a4-42b1-a641-0d6c0e24ac57');
INSERT INTO public.booking_services VALUES ('c2a2ce39-1671-4851-9c57-6addc66838cc', NULL, NULL, NULL, 1, 10000, 10000, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', 'd702d6d1-a7ec-4d4e-aa92-6585ad0d288d', '648baf9a-8682-496d-826a-e10215152bbd');


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.bookings VALUES ('a62e915b-1041-484a-adb2-f72c49a6c8f3', 'BK202606250001', '2026-05-26 06:00:00', '2026-05-26 07:00:00', 0, '2026-05-26 02:05:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('50adfae4-a3a1-46db-a5db-3645f7ec3c7f', 'BK202606250002', '2026-05-26 08:00:00', '2026-05-26 09:00:00', 0, '2026-05-26 02:10:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('6691de3f-63a0-4028-a0b1-7bfe54f14dfb', 'BK202606250003', '2026-05-26 10:00:00', '2026-05-26 11:00:00', 0, '2026-05-26 02:15:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('730c2be3-e50a-43b3-82b0-c018d216ec54', 'BK202606250004', '2026-05-26 12:00:00', '2026-05-26 13:00:00', 0, '2026-05-26 02:20:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('e6300f98-d1d1-4784-8582-fe64a9eac663', 'BK202606250005', '2026-05-26 14:00:00', '2026-05-26 15:00:00', 0, '2026-05-26 02:25:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('32d32981-68e0-430b-8892-ff8815d0ca0c', 'BK202606250006', '2026-05-26 16:00:00', '2026-05-26 17:00:00', 0, '2026-05-26 02:30:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('1093fe48-c89c-4f28-907e-25c4597b4a89', 'BK202606250007', '2026-05-26 18:00:00', '2026-05-26 19:00:00', 0, '2026-05-26 02:35:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('ac6c3972-ae07-494e-8205-2bb957efc162', 'BK202606250008', '2026-05-26 20:00:00', '2026-05-26 21:00:00', 0, '2026-05-26 02:40:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('a368dcfd-1b47-45b2-87e3-6bbc62f84afc', 'BK202606250009', '2026-05-27 06:00:00', '2026-05-27 07:00:00', 0, '2026-05-27 02:45:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('140bde43-788d-4378-a937-e0f681fb340c', 'BK202606250010', '2026-05-27 08:00:00', '2026-05-27 09:00:00', 0, '2026-05-27 02:50:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c272190c-cb38-45ce-9b7e-caf8eeac0b2f', 'BK202606250011', '2026-05-27 10:00:00', '2026-05-27 11:00:00', 0, '2026-05-27 02:55:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('be3804d0-431a-49cf-b450-b4d702e24920', 'BK202606250012', '2026-05-27 12:00:00', '2026-05-27 13:00:00', 0, '2026-05-27 03:00:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('90914bc9-e2d0-4789-9bf6-8342a2fc4f51', 'BK202606250013', '2026-05-27 14:00:00', '2026-05-27 15:00:00', 0, '2026-05-27 03:05:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c3d8509a-f939-424b-83bb-f9a20c1cf685', 'BK202606250014', '2026-05-27 16:00:00', '2026-05-27 17:00:00', 0, '2026-05-27 03:10:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('ed4b20da-83af-4d90-9e19-832534646cf3', 'BK202606250015', '2026-05-27 18:00:00', '2026-05-27 19:00:00', 0, '2026-05-27 03:15:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('08b9ebc9-0eaf-418a-9eb3-bfc9135e15f0', 'BK202606250016', '2026-05-27 20:00:00', '2026-05-27 21:00:00', 0, '2026-05-27 03:20:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('6234edac-00ea-43b7-91fd-e985b00e1b83', 'BK202606250017', '2026-05-28 06:00:00', '2026-05-28 07:00:00', 0, '2026-05-28 03:25:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('891442d8-a2fa-43dd-ab83-ae2c608c8bef', 'BK202606250018', '2026-05-28 08:00:00', '2026-05-28 09:00:00', 0, '2026-05-28 03:30:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('4485b3f2-453d-48a5-8e02-015a512e191e', 'BK202606250019', '2026-05-28 10:00:00', '2026-05-28 11:00:00', 0, '2026-05-28 03:35:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('6f92824e-676e-44ac-8f5d-25e6a3c53962', 'BK202606250020', '2026-05-28 12:00:00', '2026-05-28 13:00:00', 0, '2026-05-28 03:40:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('653cda97-e9eb-4204-a8de-ee4516429a17', 'BK202606250021', '2026-05-28 14:00:00', '2026-05-28 15:00:00', 0, '2026-05-28 03:45:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('84da936a-a24d-43cf-9742-857f930915ce', 'BK202606250022', '2026-05-28 16:00:00', '2026-05-28 17:00:00', 0, '2026-05-28 03:50:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('03881fcf-2d92-4f78-a83f-5bfb16346280', 'BK202606250023', '2026-05-28 18:00:00', '2026-05-28 19:00:00', 0, '2026-05-28 03:55:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('2a4494e5-0984-4c34-84e1-0fd0e62c78f1', 'BK202606250024', '2026-05-28 20:00:00', '2026-05-28 21:00:00', 0, '2026-05-28 04:00:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('4cc61cd7-083b-4433-8322-6a0de80980f8', 'BK202606250025', '2026-05-29 06:00:00', '2026-05-29 07:00:00', 0, '2026-05-29 04:05:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('5f4ef007-9fd0-423a-861f-d929ef128718', 'BK202606250026', '2026-05-29 08:00:00', '2026-05-29 09:00:00', 0, '2026-05-29 04:10:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('49e47714-8b1d-4a60-aa16-cfbd3aeb02ed', 'BK202606250027', '2026-05-29 10:00:00', '2026-05-29 11:00:00', 0, '2026-05-29 04:15:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('2bc4833c-9a41-4996-900e-993dfc3ed747', 'BK202606250028', '2026-05-29 12:00:00', '2026-05-29 13:00:00', 0, '2026-05-29 04:20:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('7eccb415-4261-4cf3-86bf-adb56e52172f', 'BK202606250029', '2026-05-29 14:00:00', '2026-05-29 15:00:00', 0, '2026-05-29 04:25:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('aa19b604-aee7-4643-b343-d96026a5d3d6', 'BK202606250030', '2026-05-29 16:00:00', '2026-05-29 17:00:00', 0, '2026-05-29 04:30:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('110aa907-36a4-4989-b0b5-d91eccf5d5d7', 'BK202606250031', '2026-05-29 18:00:00', '2026-05-29 19:00:00', 0, '2026-05-29 04:35:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('52d4ec97-83b6-4773-b6ce-524812853692', 'BK202606250032', '2026-05-29 20:00:00', '2026-05-29 21:00:00', 0, '2026-05-29 04:40:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('9089dfd9-ffae-4397-ae43-3a6aee63e6ff', 'BK202606250033', '2026-05-30 06:00:00', '2026-05-30 07:00:00', 0, '2026-05-30 04:45:00', 0, 300000, NULL, NULL, 50000, 'COMPLETED', 350000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('b3ae219e-3f42-488e-b9da-923da480a233', 'BK202606250034', '2026-05-30 08:00:00', '2026-05-30 09:00:00', 0, '2026-05-30 04:50:00', 0, 300000, NULL, NULL, 100000, 'COMPLETED', 400000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('d4fb8290-cb2b-4e09-a008-48eeb855edb5', 'BK202606250035', '2026-05-30 10:00:00', '2026-05-30 11:00:00', 0, '2026-05-30 04:55:00', 0, 300000, NULL, NULL, 150000, 'COMPLETED', 450000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('2797ce1f-c714-4990-8f8d-9a1861e35918', 'BK202606250036', '2026-05-30 12:00:00', '2026-05-30 13:00:00', 0, '2026-05-30 05:00:00', 0, 300000, NULL, NULL, 0, 'COMPLETED', 300000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('e2e7eb7e-d4a7-4010-ab9f-4717a7f95f99', 'BK202606250037', '2026-05-30 14:00:00', '2026-05-30 15:00:00', 0, '2026-05-30 05:05:00', 0, 300000, NULL, NULL, 50000, 'COMPLETED', 350000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('443d9824-4be8-47bf-9dee-2a1a514a97c0', 'BK202606250038', '2026-05-30 16:00:00', '2026-05-30 17:00:00', 0, '2026-05-30 05:10:00', 0, 300000, NULL, NULL, 100000, 'COMPLETED', 400000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('7f23a971-744d-4c03-b927-de2ac22c9d6b', 'BK202606250039', '2026-05-30 18:00:00', '2026-05-30 19:00:00', 0, '2026-05-30 05:15:00', 0, 300000, NULL, NULL, 150000, 'COMPLETED', 450000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('bc33635e-8b3a-4964-bcc9-4c6aef11f712', 'BK202606250040', '2026-05-30 20:00:00', '2026-05-30 21:00:00', 0, '2026-05-30 05:20:00', 0, 300000, NULL, NULL, 0, 'COMPLETED', 300000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c357c3ac-5ec6-4f1d-ab97-9e8a3d8e7595', 'BK202606250041', '2026-05-31 06:00:00', '2026-05-31 07:00:00', 0, '2026-05-31 05:25:00', 0, 300000, NULL, NULL, 50000, 'COMPLETED', 350000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('7c5e1dad-1062-4d6d-bb72-8c458a8196bb', 'BK202606250042', '2026-05-31 08:00:00', '2026-05-31 09:00:00', 0, '2026-05-31 05:30:00', 0, 300000, NULL, NULL, 100000, 'COMPLETED', 400000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c225cc56-4232-417f-8d8d-22d330e15225', 'BK202606250043', '2026-05-31 10:00:00', '2026-05-31 11:00:00', 0, '2026-05-31 05:35:00', 0, 300000, NULL, NULL, 150000, 'COMPLETED', 450000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('eae815ea-ac59-4a9a-9e66-9f0f64662f81', 'BK202606250044', '2026-05-31 12:00:00', '2026-05-31 13:00:00', 0, '2026-05-31 05:40:00', 0, 300000, NULL, NULL, 0, 'COMPLETED', 300000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c354698e-1e92-4a01-a068-0798eb035585', 'BK202606250045', '2026-05-31 14:00:00', '2026-05-31 15:00:00', 0, '2026-05-31 05:45:00', 0, 300000, NULL, NULL, 50000, 'COMPLETED', 350000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('edd06f2e-b6ed-4d49-8a9f-961f4e03ae14', 'BK202606250046', '2026-05-31 16:00:00', '2026-05-31 17:00:00', 0, '2026-05-31 05:50:00', 0, 300000, NULL, NULL, 100000, 'COMPLETED', 400000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('3e93849a-3103-4ed3-8626-17b273f76cc2', 'BK202606250047', '2026-05-31 18:00:00', '2026-05-31 19:00:00', 0, '2026-05-31 05:55:00', 0, 300000, NULL, NULL, 150000, 'COMPLETED', 450000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('bee3997a-e8ac-4a10-b8bf-c9ff0b24072a', 'BK202606250048', '2026-05-31 20:00:00', '2026-05-31 21:00:00', 0, '2026-05-31 06:00:00', 0, 300000, NULL, NULL, 0, 'COMPLETED', 300000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('57d5054e-6b01-4a06-81f0-f393a189ca35', 'BK202606250049', '2026-06-01 06:00:00', '2026-06-01 07:00:00', 0, '2026-06-01 06:05:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('f4bc3ad8-4756-44bf-827e-4c094506a3e8', 'BK202606250050', '2026-06-01 08:00:00', '2026-06-01 09:00:00', 0, '2026-06-01 06:10:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('50dfe1f0-2cc9-4f29-a70a-2e9687c410b8', 'BK202606250051', '2026-06-01 10:00:00', '2026-06-01 11:00:00', 0, '2026-06-01 06:15:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('a0a657bf-c0d1-4b3d-a6de-af99df2629b8', 'BK202606250052', '2026-06-01 12:00:00', '2026-06-01 13:00:00', 0, '2026-06-01 06:20:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('ceca02c3-9fc1-4cc8-9390-5df2f76992c1', 'BK202606250053', '2026-06-01 14:00:00', '2026-06-01 15:00:00', 0, '2026-06-01 06:25:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('9af421f9-445f-4343-9e3c-fbb74f685ef4', 'BK202606250054', '2026-06-01 16:00:00', '2026-06-01 17:00:00', 0, '2026-06-01 06:30:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('a0cdefee-0597-4ee5-b357-0a3c902c28bd', 'BK202606250055', '2026-06-01 18:00:00', '2026-06-01 19:00:00', 0, '2026-06-01 06:35:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('826f4e45-a3da-4e4a-b3ff-93088214e86f', 'BK202606250056', '2026-06-01 20:00:00', '2026-06-01 21:00:00', 0, '2026-06-01 06:40:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('9f501b53-22d4-4a82-93f4-a3d7a9b059d8', 'BK202606250057', '2026-06-02 06:00:00', '2026-06-02 07:00:00', 0, '2026-06-02 06:45:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('4e87e2b7-49b1-4bbe-b55f-66aa90ed2f96', 'BK202606250058', '2026-06-02 08:00:00', '2026-06-02 09:00:00', 0, '2026-06-02 06:50:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('efe671ed-cd08-435d-bf13-48f9f8e29df3', 'BK202606250059', '2026-06-02 10:00:00', '2026-06-02 11:00:00', 0, '2026-06-02 06:55:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('84529d2a-146e-408d-95ff-7e935cca462b', 'BK202606250060', '2026-06-02 12:00:00', '2026-06-02 13:00:00', 0, '2026-06-02 07:00:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('ddcce2a8-21f9-4481-aeec-7820e4a44de9', 'BK202606250061', '2026-06-02 14:00:00', '2026-06-02 15:00:00', 0, '2026-06-02 07:05:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('12c4f519-a5a9-4598-9909-24c29e4bf9fa', 'BK202606250062', '2026-06-02 16:00:00', '2026-06-02 17:00:00', 0, '2026-06-02 07:10:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('ad21de21-3206-4334-8e4d-2acca0b350fc', 'BK202606250063', '2026-06-02 18:00:00', '2026-06-02 19:00:00', 0, '2026-06-02 07:15:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('282fab03-5fc4-4b68-b43f-76d25cebd640', 'BK202606250064', '2026-06-02 20:00:00', '2026-06-02 21:00:00', 0, '2026-06-02 07:20:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('f3e0c0b3-3058-430c-966b-b33f2e2034e9', 'BK202606250065', '2026-06-03 06:00:00', '2026-06-03 07:00:00', 0, '2026-06-03 07:25:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('d94aa3da-d1a4-4b2b-9dd7-9e24b1e71ec4', 'BK202606250066', '2026-06-03 08:00:00', '2026-06-03 09:00:00', 0, '2026-06-03 07:30:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('27b3854f-8b57-49b6-9d95-1e40fa07936a', 'BK202606250067', '2026-06-03 10:00:00', '2026-06-03 11:00:00', 0, '2026-06-03 07:35:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('9bcd5825-a3c6-4b63-bee6-5033d458ae6b', 'BK202606250068', '2026-06-03 12:00:00', '2026-06-03 13:00:00', 0, '2026-06-03 07:40:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('92cf884d-8708-4dd9-a005-0eeab730bec5', 'BK202606250069', '2026-06-03 14:00:00', '2026-06-03 15:00:00', 0, '2026-06-03 07:45:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('a293fc80-43a7-4244-bc1c-dd96b45d51ba', 'BK202606250070', '2026-06-03 16:00:00', '2026-06-03 17:00:00', 0, '2026-06-03 07:50:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('03aac4b9-8486-4a34-b2e3-fd251d6d191c', 'BK202606250071', '2026-06-03 18:00:00', '2026-06-03 19:00:00', 0, '2026-06-03 07:55:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c411c1e9-2445-4298-b89b-c778efdf824e', 'BK202606250072', '2026-06-03 20:00:00', '2026-06-03 21:00:00', 0, '2026-06-03 08:00:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('3c7b27bb-b807-4f9c-83fd-914d79b9f3e1', 'BK202606250073', '2026-06-04 06:00:00', '2026-06-04 07:00:00', 0, '2026-06-04 08:05:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('782c0335-0d11-4c25-a263-5a0e668f7421', 'BK202606250074', '2026-06-04 08:00:00', '2026-06-04 09:00:00', 0, '2026-06-04 08:10:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('173cc276-3365-4e04-8947-067c520c438f', 'BK202606250075', '2026-06-04 10:00:00', '2026-06-04 11:00:00', 0, '2026-06-04 08:15:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('ab029a23-e8c1-4dea-b0ef-18975668ad85', 'BK202606250076', '2026-06-04 12:00:00', '2026-06-04 13:00:00', 0, '2026-06-04 08:20:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('1f7e375c-b328-4b77-8671-35061a869fe3', 'BK202606250077', '2026-06-04 14:00:00', '2026-06-04 15:00:00', 0, '2026-06-04 08:25:00', 0, 240000, NULL, NULL, 50000, 'COMPLETED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('94b69a4f-2dfd-4a23-a0c4-82ca98e7a899', 'BK202606250078', '2026-06-04 16:00:00', '2026-06-04 17:00:00', 0, '2026-06-04 08:30:00', 0, 240000, NULL, NULL, 100000, 'COMPLETED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('beaf3b5d-9593-46fb-bc01-65a9b402406b', 'BK202606250079', '2026-06-04 18:00:00', '2026-06-04 19:00:00', 0, '2026-06-04 08:35:00', 0, 240000, NULL, NULL, 150000, 'COMPLETED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('9d93f8ab-c821-46fb-a28d-892c9ff9e727', 'BK202606250080', '2026-06-04 20:00:00', '2026-06-04 21:00:00', 0, '2026-06-04 08:40:00', 0, 240000, NULL, NULL, 0, 'COMPLETED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c39c3541-39eb-4881-b9bc-52a805f5989d', 'BK202606250081', NULL, NULL, 0, '2026-06-05 08:45:00', 0, 240000, NULL, NULL, 50000, 'CONFIRMED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('86b03f1f-d197-4cf7-9fb5-48367148666b', 'BK202606250082', NULL, NULL, 0, '2026-06-05 08:50:00', 0, 240000, NULL, NULL, 100000, 'CONFIRMED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('be47215d-4628-4d64-8fdd-547072a6b875', 'BK202606250083', NULL, NULL, 0, '2026-06-05 08:55:00', 0, 240000, NULL, NULL, 150000, 'CONFIRMED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('b8118798-7808-4ef8-b09e-d616a6f22054', 'BK202606250084', NULL, NULL, 0, '2026-06-05 09:00:00', 0, 240000, NULL, NULL, 0, 'CONFIRMED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('09f4b7e2-eb4f-402d-8aa9-269b101cd1fd', 'BK202606250085', NULL, NULL, 0, '2026-06-05 09:05:00', 0, 240000, NULL, NULL, 50000, 'CONFIRMED', 290000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('8df4e4af-ec66-4d21-af9a-58ac3ab2c5d9', 'BK202606250086', NULL, NULL, 0, '2026-06-05 09:10:00', 0, 240000, NULL, NULL, 100000, 'CONFIRMED', 340000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('2264adeb-082a-493a-87c2-f2739dae0d7e', 'BK202606250087', NULL, NULL, 0, '2026-06-05 09:15:00', 0, 240000, NULL, NULL, 150000, 'CONFIRMED', 390000, '2026-06-25 17:54:11.060877', 'd45d2887-3a8c-449c-a99f-00df705c93da', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('100a6e3d-ee05-4f75-98ab-2b193b2cff0c', 'BK202606250088', NULL, NULL, 0, '2026-06-05 09:20:00', 0, 240000, NULL, NULL, 0, 'CONFIRMED', 240000, '2026-06-25 17:54:11.060877', '5d672dc9-5c07-4ed5-9863-f3d9189771ac', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('c938e123-238e-42d1-b82a-8a5176d62bf9', 'BK202606250089', NULL, NULL, 0, '2026-06-06 09:25:00', 0, 300000, NULL, NULL, 50000, 'CONFIRMED', 350000, '2026-06-25 17:54:11.060877', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('d0a5cff3-6929-4ff9-8d2c-2860d23cd421', 'BK202606250090', NULL, NULL, 0, '2026-06-06 09:30:00', 0, 300000, NULL, NULL, 100000, 'CONFIRMED', 400000, '2026-06-25 17:54:11.060877', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7', NULL);
INSERT INTO public.bookings VALUES ('d702d6d1-a7ec-4d4e-aa92-6585ad0d288d', 'FFZ-20260713-2187', NULL, NULL, 0, '2026-07-13 18:18:58.655913', 48000, 400000, 'Hủy: không rõ lý do', '2026-07-13 18:28:58.653763', 80000, 'CANCELLED', 432000, '2026-07-13 18:20:32.689981', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '3c50ab47-1357-4c6c-93dd-503b7960cd18', '6a2b5151-c55b-4965-ae52-b7dcac3fde27');
INSERT INTO public.bookings VALUES ('d3e5e90b-7421-4733-9cfe-ecd47f81f695', 'FFZ-20260713-2123', NULL, NULL, 0, '2026-07-13 18:20:54.117932', 0, 200000, 'Hủy: không rõ lý do', '2026-07-13 18:30:54.116366', 0, 'CANCELLED', 200000, '2026-07-13 18:22:14.783659', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '3c50ab47-1357-4c6c-93dd-503b7960cd18', NULL);
INSERT INTO public.bookings VALUES ('4ec5bf67-ea0b-4f46-b0ca-fcf15329dbbb', 'FFZ-20260713-5080', NULL, NULL, 0, '2026-07-13 18:24:13.426722', 0, 200000, 'Tự động hủy: quá hạn thanh toán', '2026-07-13 18:34:13.420929', 0, 'CANCELLED', 200000, '2026-07-13 18:34:27.175113', '1c986827-4d49-41f8-9e7b-e060b5e2bdb4', '3c50ab47-1357-4c6c-93dd-503b7960cd18', NULL);
INSERT INTO public.bookings VALUES ('f1e6abbb-40b9-4af4-a65c-afea154e4d35', 'FFZ-20260713-6510', NULL, NULL, 0, '2026-07-13 18:36:25.437736', 0, 200000, 'Hủy: không rõ lý do', '2026-07-13 18:46:25.420206', 0, 'CANCELLED', 200000, '2026-07-13 18:38:36.069702', '1c986827-4d49-41f8-9e7b-e060b5e2bdb4', '3c50ab47-1357-4c6c-93dd-503b7960cd18', NULL);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: ffzone
--



--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.carts VALUES ('9b98c98b-f6e4-4600-8081-f5adb75efdd1', '2026-06-29 18:25:55.195957', '2026-06-29 18:25:55.195957', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e');
INSERT INTO public.carts VALUES ('2b7b9ec1-7efa-4168-97de-1730898069ca', '2026-06-29 20:12:29.535968', '2026-06-29 20:12:29.535968', '91fdd23f-85e6-4f0e-9a90-3ece244e33f6');
INSERT INTO public.carts VALUES ('ec30b3f5-eae6-473e-8303-fb6bfb198dc9', '2026-06-30 20:44:42.29738', '2026-06-30 20:44:42.29738', 'd45d2887-3a8c-449c-a99f-00df705c93da');
INSERT INTO public.carts VALUES ('75c84350-b63d-4957-8be1-df00a82e37ed', '2026-07-01 09:59:37.126002', '2026-07-01 09:59:37.126002', '1c986827-4d49-41f8-9e7b-e060b5e2bdb4');
INSERT INTO public.carts VALUES ('87da2ce5-58c5-459b-90a8-6f36bc81e494', '2026-07-01 09:59:45.246047', '2026-07-01 09:59:45.246047', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166');


--
-- Data for Name: field_images; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.field_images VALUES ('b79852f7-8802-4b25-aff0-5809e5afbbf4', '2026-07-11 13:24:39.113681', 'uploads/field-images/a47bc069-f5cf-4779-a8e3-3cd4a55a78b2.jpg', true, '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_images VALUES ('c1b06966-cbf6-4328-848d-bba80d7e7f86', '2026-07-11 13:24:53.831794', 'uploads/field-images/d0df94bd-adfc-425a-91c5-91253ff5e63c.jpg', true, '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_images VALUES ('b3e2aa33-6f26-4279-8558-3b6676f99c5c', '2026-07-11 13:25:21.535627', 'uploads/field-images/57e67ec6-f7f0-4449-8807-1b33fad4f189.jpg', true, '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_images VALUES ('b62bda9a-4ca5-408a-8c9b-69d3307017ad', '2026-07-11 13:25:45.472471', 'uploads/field-images/774dca6c-df2e-4071-bef8-84927514252a.jpg', false, '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_images VALUES ('4de31ea5-3eba-4507-891a-0649cd88834a', '2026-07-11 13:26:02.886182', 'uploads/field-images/93822109-ae03-4cfd-9caa-5a7d676c65b3.jpg', true, 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_images VALUES ('8d48fdc8-2cab-4037-aaec-e079471d4eb1', '2026-07-11 13:26:21.487436', 'uploads/field-images/1f64d858-e570-4448-b5a0-3d0ff9484ba0.jpg', true, '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_images VALUES ('d246f338-5ca6-49d9-935e-7387190d8392', '2026-07-11 13:27:00.324859', 'uploads/field-images/29043d8c-9b42-4508-adc1-913b0dd4000a.jpg', true, '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_images VALUES ('9fb06df1-c260-44d4-b0d2-b0c50ee531ed', '2026-07-11 13:27:51.919979', 'uploads/field-images/20fb5d21-6da9-4270-9926-262331e19e0e.jpg', false, '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_images VALUES ('d5c963ea-6293-4fe2-9af6-d2de9f372ab3', '2026-07-11 13:28:08.055048', 'uploads/field-images/987a438d-4637-404a-9bc2-3366a2585249.jpg', false, '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_images VALUES ('189a005d-8b2a-4d5a-9c3c-65bf5e7996db', '2026-07-11 13:29:16.89888', 'uploads/field-images/357619fa-c06f-4836-a69f-5b11ba40b1b5.jpg', true, 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_images VALUES ('962c9e85-d72e-46d6-824d-322ba7a7632b', '2026-07-11 13:29:40.66932', 'uploads/field-images/70404460-d040-42be-99db-4dbf39fd01a2.jpg', false, 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_images VALUES ('c06cc2b6-91c5-4e69-b657-cf4aa4866883', '2026-07-11 13:30:23.003472', 'uploads/field-images/700a38c1-6518-4738-89d5-cbc285d0a2e7.jpg', true, '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_images VALUES ('277e3466-2b8c-42b8-9768-9e598b0d3206', '2026-07-11 13:26:42.217372', 'uploads/field-images/67be3aa7-ae9b-4e08-825e-14c789f6c791.jpg', false, '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_images VALUES ('17c6cfdc-6c5a-4341-a530-0b104623d248', '2026-07-11 13:31:23.120141', 'uploads/field-images/c680be18-2923-4a9e-8382-b1abdc9517dc.jpg', true, 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_images VALUES ('beff75b2-9a57-4246-8f2b-2407ef7d8a66', '2026-06-23 10:18:42.076908', 'uploads/field-images/78dca7be-bf7f-4383-aaf8-aa69c3af07ec.jpg', false, 'f5d0d079-44c7-4b48-96cb-eed3ab459946');


--
-- Data for Name: field_pricing; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.field_pricing VALUES ('4f187890-9bae-4c89-bcac-13e911602dc7', '2026-06-29 18:19:11.782342', 'WEEKDAY', '2026-06-29', NULL, '00:00:00', NULL, false, 200000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('0be0f13c-7a45-4e98-878e-6d344b5d4a46', '2026-06-29 18:19:11.813414', 'WEEKEND', '2026-06-29', NULL, '00:00:00', NULL, false, 250000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('e5d6b66a-59f7-4440-b667-4e8da9ec588c', '2026-06-29 18:20:32.214137', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 241000, '06:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('4b8908e4-c732-45c4-8e8f-e19740ff640d', '2026-06-29 18:20:32.217134', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 302000, '06:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('1dffc8b9-fc29-4848-be38-75079f68efe8', '2026-06-29 18:20:32.219541', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 241000, '06:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('a2766e1a-de65-4269-bc7f-df07276be1e1', '2026-06-29 18:20:32.220546', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 302000, '06:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('11e3ec34-4946-42a3-a886-f4b230e29cf4', '2026-06-29 18:20:32.221835', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 241000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('b8aea1b5-e701-477f-b3bd-807c147b1d41', '2026-06-29 18:20:32.224292', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 302000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('60474340-9f08-472b-8672-b68c597f57c7', '2026-06-29 18:21:11.16781', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 240000, '06:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('4eb16b0b-a85a-462c-8e23-a80fccb63dea', '2026-06-29 18:21:11.170247', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 300000, '06:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('d115ffdc-bb48-4d11-a83a-600387726cb5', '2026-06-29 18:21:11.17156', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 240000, '06:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('fb416376-23a2-431e-bd37-875d421ede0d', '2026-06-29 18:21:11.172634', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 300000, '06:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('5a439784-4404-45a2-9420-749ed55c5c0b', '2026-06-29 18:21:11.173648', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 240000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('9e678d57-2bbe-41e7-856a-1e680538527b', '2026-06-29 18:21:11.174876', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 300000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('a771647a-3aae-4d05-bfb5-bd82f4a1455f', '2026-06-29 18:21:16.61783', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 300000, '06:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('c33a7876-191c-4434-aeb8-579779249eb8', '2026-06-29 18:21:16.62114', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 375000, '06:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('2348dd7a-253f-4f7e-afd3-81530289533c', '2026-06-29 18:21:04.301094', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('56181e33-a467-4ad8-9da7-1362c2bd834d', '2026-06-29 18:21:04.303685', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('2a285695-1c17-4172-87bd-ca2e5260ff23', '2026-06-29 18:21:04.305715', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('7e27649c-921a-4f76-a9de-6a317b6e3efa', '2026-06-29 18:21:04.307088', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('0a1acf75-8f7f-4b67-9e90-4e73896fe8e0', '2026-06-29 18:21:04.308086', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('4946f7e2-0f48-456f-a91f-9c6b6e266661', '2026-06-29 18:21:04.309141', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('4dfeacd4-c277-4a26-af6c-5c84209fe733', '2026-06-29 18:21:04.310498', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('0d282f87-e1ac-4fe7-b146-bcacb3087df8', '2026-06-29 18:21:04.311726', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('ccac6d11-2d08-49d5-aaf9-1c7c3c2037eb', '2026-06-29 18:21:04.313117', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('43e08320-6bfc-4a6a-a519-eca1c2990907', '2026-06-29 18:21:04.314105', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('382eb203-5a1b-420a-afd7-f9e6582a8ca1', '2026-06-29 18:22:15.298031', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('dc5e706f-f50d-4dad-8bb1-7b91130b993f', '2026-06-29 18:22:15.300019', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('884cd622-88fd-4f4c-ad8c-f7cfd1aea841', '2026-06-29 18:22:15.301017', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('35dfdd06-37c0-4800-8c8c-16d7706c6550', '2026-06-29 18:22:15.303009', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('a32dfc85-1bf7-458e-ab45-19e4e98d3931', '2026-06-29 18:22:15.304004', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('430af859-f6f2-4c96-8b5a-25a9a92c764e', '2026-06-29 18:22:15.306228', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('9c356e7d-40b5-49b5-84db-96b0b6986436', '2026-06-29 18:22:15.307214', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('621265e2-1828-4e4d-a28a-81250e0edf6b', '2026-06-29 18:22:15.308212', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('1b0191bd-402d-4fd9-a279-e16fbeaa0934', '2026-06-29 18:22:15.309216', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('acd48e9d-8522-447a-b60e-77de50600bd0', '2026-06-29 18:22:15.310199', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('eab221fe-fa67-4364-a1b3-9cb551149724', '2026-06-29 18:22:34.55208', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 200000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('4f9db0fe-2162-48c0-97e2-b92ec7a2d4bb', '2026-06-29 18:22:34.555075', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 250000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('e8cbdca9-7935-4334-9b8a-c2c9b9b8a518', '2026-06-29 18:23:40.361652', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 300000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('62baa33a-8d5d-4168-bb78-27a03931fa27', '2026-06-29 18:23:40.367102', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 300000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('3a2448cc-1265-47d0-aa3f-d8086aa79b0e', '2026-06-29 18:23:40.372595', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 360000, '06:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('0b71f1aa-e087-4454-b2d2-026ea055e283', '2026-06-29 18:23:40.37842', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 450000, '06:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('387d1818-e2ec-404c-8ee9-145025ba94f5', '2026-06-29 18:23:40.383453', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 300000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('537ee63f-974c-49af-9305-8e266b8eec5d', '2026-06-29 18:23:40.388367', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 360000, '06:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('435e8d4c-6cb8-4fbb-808f-a8935981a072', '2026-06-29 18:23:40.39318', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 300000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('6942da61-536c-40fe-8558-9ff70af5b545', '2026-06-29 18:23:40.397958', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 360000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('fd8dc1ce-d9af-45b6-9593-ecfb4f4a627a', '2026-06-29 18:23:40.402841', 'HOLIDAY', '2026-07-01', '2026-07-05', '00:00:00', 'SUMMERTIME', true, 300000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('eae67cad-96dd-467d-b892-aee269b171dc', '2026-06-29 11:19:04.536587', 'WEEKDAY', '2026-06-29', NULL, '23:00:00', NULL, false, 200000, '05:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('e9726acd-689d-4bea-8a4c-7ee2659d35ce', '2026-06-29 11:19:04.536587', 'WEEKEND', '2026-06-29', NULL, '23:00:00', NULL, false, 250000, '05:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('57f4930b-d9ad-4f2c-9252-e5344233830d', '2026-06-29 11:19:04.536587', 'WEEKDAY', '2026-06-29', NULL, '23:00:00', NULL, false, 200000, '05:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('930eea7d-75d1-4880-9f13-eeb5645c22cf', '2026-06-29 11:19:04.536587', 'WEEKEND', '2026-06-29', NULL, '23:00:00', NULL, false, 250000, '05:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('28cc977e-6ee2-44ee-a65f-d3e6a80f2f7d', '2026-06-29 11:19:04.536587', 'WEEKDAY', '2026-06-29', NULL, '23:00:00', NULL, false, 200000, '05:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('2b278fef-2af9-40e1-839f-cb0890c76eaf', '2026-06-29 11:19:04.536587', 'WEEKEND', '2026-06-29', NULL, '23:00:00', NULL, false, 250000, '05:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('0ef2402f-c97e-45d8-87b6-cefc8fe7fc86', '2026-06-29 18:19:51.826254', 'WEEKDAY', '2026-06-29', NULL, '00:00:00', NULL, false, 200000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('20c4ad7e-00e2-4f17-917b-540cee2e69df', '2026-06-29 18:19:51.829404', 'WEEKEND', '2026-06-29', NULL, '00:00:00', NULL, false, 250000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('c2bab929-754a-455f-b82b-de7690c0980e', '2026-06-29 11:19:04.536587', 'WEEKDAY', '2026-06-29', NULL, '23:00:00', NULL, false, 240000, '05:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('9940fb41-6a14-4d5d-90ea-0d1d327e9844', '2026-06-29 11:19:04.536587', 'WEEKEND', '2026-06-29', NULL, '23:00:00', NULL, false, 300000, '05:00:00', '04bb8fce-9b6c-4336-9aab-bdc26e1892b7');
INSERT INTO public.field_pricing VALUES ('6d6d33b4-156f-4716-8026-bde6c0ca85bf', '2026-06-29 11:19:04.536587', 'WEEKDAY', '2026-06-29', NULL, '23:00:00', NULL, false, 240000, '05:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('544f5c72-9e82-4e68-a14d-50c05c6d20af', '2026-06-29 11:19:04.536587', 'WEEKEND', '2026-06-29', NULL, '23:00:00', NULL, false, 300000, '05:00:00', '1f208f48-5542-47ec-bee6-9c83b55b5eca');
INSERT INTO public.field_pricing VALUES ('3d1a0af9-1c12-474b-8c19-811eb04c48e4', '2026-06-29 18:19:26.942988', 'WEEKDAY', '2026-06-29', NULL, '00:00:00', NULL, false, 240000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('d76d46cd-48e5-476d-8452-75a600fa8ce9', '2026-06-29 18:19:26.946993', 'WEEKEND', '2026-06-29', NULL, '00:00:00', NULL, false, 300000, '06:00:00', '85802120-090d-4887-b78b-c0a38bf8c302');
INSERT INTO public.field_pricing VALUES ('73e049bf-859f-4527-838d-df9f20bd0288', '2026-06-29 11:19:04.536587', 'WEEKDAY', '2026-06-29', NULL, '23:00:00', NULL, false, 300000, '05:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('df348925-7988-4619-b734-5b593906e123', '2026-06-29 11:19:04.536587', 'WEEKEND', '2026-06-29', NULL, '23:00:00', NULL, false, 375000, '05:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('a6e8ff84-db5e-4abb-ad5f-dd8152eda776', '2026-06-29 18:20:25.427713', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('2f5bb4d5-2a69-402f-8635-f2cc8c1ed47d', '2026-06-29 18:20:25.430685', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('67cf3c20-6bbb-496a-9a3d-73f85103e101', '2026-06-29 18:20:25.435686', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('e5dde442-0dec-488f-a629-171eabfd5a01', '2026-06-29 18:20:25.437685', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('22d26db6-77ca-4802-ad0e-f463125faa40', '2026-06-29 18:20:25.439013', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('89b3d9d9-420d-45a0-b7f4-fa1f5b123372', '2026-06-29 18:20:25.441021', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('ebc0a4b6-8e68-4998-b158-88dcb5809ced', '2026-06-29 18:20:25.442019', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('80f6b5ec-dc1a-4621-84ab-8594d4b527eb', '2026-06-29 18:20:25.444024', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('e682d8e7-3846-4064-aa6f-6193ca9f5ca3', '2026-06-29 18:20:25.445021', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('d4487cc8-b8a3-4350-8618-cb0c3fce717d', '2026-06-29 18:20:25.447019', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('435b5175-da21-4244-9873-cde9fff1a6dd', '2026-06-29 18:20:38.21199', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 301000, '06:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('b5d16b42-f437-4660-8657-80590f642aee', '2026-06-29 18:20:38.216106', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 377000, '06:00:00', '9a89baf9-3732-45ba-98ff-896761c42184');
INSERT INTO public.field_pricing VALUES ('de678cdd-5d8f-4247-9616-6dbad831a900', '2026-06-29 18:21:22.836177', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('ba030dc0-8504-4b4d-b0fa-753bd71dcef3', '2026-06-29 18:21:22.838237', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('fb4eb5c9-83af-4ce8-acf8-127b8f3bd2d6', '2026-06-29 18:22:21.673556', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('c282087b-c21b-44b2-b16c-22ec36b73c7b', '2026-06-29 18:22:21.675564', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('f970cdc7-8584-416e-bd32-916da7460b2c', '2026-06-29 18:22:21.676592', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('86e97af6-2277-46a8-a3a2-b7652b0d7186', '2026-06-29 18:22:21.679423', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('452a42ee-0db3-44d2-afa3-c3f2cef84b7d', '2026-06-29 18:22:21.68042', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('b4aa3b14-fe35-4dfa-ae80-a6f9f4909c4e', '2026-06-29 18:22:21.681584', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('97b0bbe9-90b7-467c-9b90-b95366176d4b', '2026-06-29 18:22:21.682585', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('fec4e950-2749-40f2-8ba4-a77a8bd3ab91', '2026-06-29 18:22:21.685818', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('680f4d68-3045-43ac-a3a4-150781d09147', '2026-06-29 18:22:21.687806', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, false, 201000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('97190e3c-c675-4a4f-96e0-4792a2ee2bf5', '2026-06-29 18:22:21.689331', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, false, 252000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('6bcb8d85-8ab5-4fa8-a3a9-424d08ff9957', '2026-06-29 18:22:41.685881', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 200000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('d31a7c13-cb1a-423d-be1c-312b890dcacf', '2026-06-29 18:22:41.686899', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 250000, '06:00:00', '3c50ab47-1357-4c6c-93dd-503b7960cd18');
INSERT INTO public.field_pricing VALUES ('52e4e586-7772-495c-a308-6c9a60418c1b', '2026-06-29 18:22:41.688359', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 200000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('d6f62d73-446a-4daf-9d26-c65be692025d', '2026-06-29 18:22:41.689359', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 250000, '06:00:00', 'f5d0d079-44c7-4b48-96cb-eed3ab459946');
INSERT INTO public.field_pricing VALUES ('fa5c0f06-0135-4eb4-b0f8-785a257cae6b', '2026-06-29 18:22:41.690524', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 200000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('82ac5b74-29f4-4546-b3e7-54c48b3a2122', '2026-06-29 18:22:41.691553', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 250000, '06:00:00', 'e94f7ad4-414e-4991-bba2-a87ecc556fdc');
INSERT INTO public.field_pricing VALUES ('bdcadd5f-e0de-45ea-b0b0-0a594e097eb6', '2026-06-29 18:22:41.692571', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 200000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('8acb03ae-ecce-455c-9dcb-4c9be9a08438', '2026-06-29 18:22:41.693566', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 250000, '06:00:00', '75c2d6ba-a086-44b6-9128-4bad3fd1f299');
INSERT INTO public.field_pricing VALUES ('3090a468-610f-49b3-9418-eb9e5199b7db', '2026-06-29 18:22:41.694561', 'WEEKDAY', '2026-06-29', NULL, '00:30:00', NULL, true, 200000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');
INSERT INTO public.field_pricing VALUES ('be65d836-6a43-40ea-9273-01aeab7f2fa4', '2026-06-29 18:22:41.695558', 'WEEKEND', '2026-06-29', NULL, '00:30:00', NULL, true, 250000, '06:00:00', 'fd839324-5405-4ee4-a68c-17d576dab1ac');


--
-- Data for Name: fields; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.fields VALUES ('3c50ab47-1357-4c6c-93dd-503b7960cd18', 'FIELD-D', '2026-06-17 18:53:13.248708', '', 'Sân D', 'ACTIVE', '5V5', '2026-06-17 18:53:13.248708');
INSERT INTO public.fields VALUES ('f5d0d079-44c7-4b48-96cb-eed3ab459946', 'FIELD-A', '2026-06-16 11:07:10.348159', 'Sân cỏ nhân tạo 5v5, có mái che', 'Sân A', 'ACTIVE', '5V5', '2026-06-16 11:07:10.348159');
INSERT INTO public.fields VALUES ('04bb8fce-9b6c-4336-9aab-bdc26e1892b7', 'FIELD-B', '2026-06-16 11:07:10.348159', 'Sân cỏ nhân tạo 7v7', 'Sân B', 'ACTIVE', '7V7', '2026-06-16 11:07:10.348159');
INSERT INTO public.fields VALUES ('9a89baf9-3732-45ba-98ff-896761c42184', 'FIELD-C', '2026-06-16 11:07:10.348159', 'Sân cỏ tự nhiên 9v9', 'Sân C', 'ACTIVE', '9V9', '2026-06-16 11:07:10.348159');
INSERT INTO public.fields VALUES ('e94f7ad4-414e-4991-bba2-a87ecc556fdc', 'FIELD-E', '2026-06-28 15:12:12.244669', '', 'Sân E', 'ACTIVE', '5V5', '2026-06-28 15:12:12.244669');
INSERT INTO public.fields VALUES ('1f208f48-5542-47ec-bee6-9c83b55b5eca', 'FIELD-G', '2026-06-29 09:45:43.204486', '', 'Sân G', 'ACTIVE', '7V7', '2026-06-29 09:45:43.204486');
INSERT INTO public.fields VALUES ('75c2d6ba-a086-44b6-9128-4bad3fd1f299', 'FIELD-F', '2026-06-29 18:19:11.745141', '', 'Sân F', 'ACTIVE', '5V5', '2026-06-29 18:19:11.745141');
INSERT INTO public.fields VALUES ('85802120-090d-4887-b78b-c0a38bf8c302', 'FIELD-H', '2026-06-29 18:19:26.935994', '', 'Sân H', 'ACTIVE', '7V7', '2026-06-29 18:19:26.935994');
INSERT INTO public.fields VALUES ('fd839324-5405-4ee4-a68c-17d576dab1ac', 'FIELD-J', '2026-06-29 18:19:51.81985', '', 'Sân J', 'ACTIVE', '5V5', '2026-06-29 18:19:51.81985');


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.payments VALUES ('f9ac0350-f0aa-43ac-91b0-f5fa671c7954', 290000, '2026-05-26 02:05:00', '2026-05-26 02:10:00', 'VNPAY', 'PAID', '00', 'VNPTXNa62e915b1041484a', 'FFZ-SEED-a62e915b1041484a', 'a62e915b-1041-484a-adb2-f72c49a6c8f3');
INSERT INTO public.payments VALUES ('8385799f-10ac-4210-9def-0c9e313f53a2', 340000, '2026-05-26 02:10:00', '2026-05-26 02:15:00', 'VNPAY', 'PAID', '00', 'VNPTXN50adfae4a3a146db', 'FFZ-SEED-50adfae4a3a146db', '50adfae4-a3a1-46db-a5db-3645f7ec3c7f');
INSERT INTO public.payments VALUES ('fa59d0e7-291a-4af7-a2e2-000c47955869', 390000, '2026-05-26 02:15:00', '2026-05-26 02:20:00', 'VNPAY', 'PAID', '00', 'VNPTXN6691de3f63a04028', 'FFZ-SEED-6691de3f63a04028', '6691de3f-63a0-4028-a0b1-7bfe54f14dfb');
INSERT INTO public.payments VALUES ('0b4918c1-873e-45e7-89bf-55be5c657dcd', 240000, '2026-05-26 02:20:00', '2026-05-26 02:25:00', 'VNPAY', 'PAID', '00', 'VNPTXN730c2be3e50a43b3', 'FFZ-SEED-730c2be3e50a43b3', '730c2be3-e50a-43b3-82b0-c018d216ec54');
INSERT INTO public.payments VALUES ('c82c9c5f-6dc2-4c2b-889a-ae686aa37098', 290000, '2026-05-26 02:25:00', '2026-05-26 02:30:00', 'VNPAY', 'PAID', '00', 'VNPTXNe6300f98d1d14784', 'FFZ-SEED-e6300f98d1d14784', 'e6300f98-d1d1-4784-8582-fe64a9eac663');
INSERT INTO public.payments VALUES ('f3176851-cd9d-4ed9-9aaa-8e5572f93027', 340000, '2026-05-26 02:30:00', '2026-05-26 02:35:00', 'VNPAY', 'PAID', '00', 'VNPTXN32d3298168e0430b', 'FFZ-SEED-32d3298168e0430b', '32d32981-68e0-430b-8892-ff8815d0ca0c');
INSERT INTO public.payments VALUES ('e8925132-a37f-4efa-8084-9f51ae1a9be8', 390000, '2026-05-26 02:35:00', '2026-05-26 02:40:00', 'VNPAY', 'PAID', '00', 'VNPTXN1093fe48c89c4f28', 'FFZ-SEED-1093fe48c89c4f28', '1093fe48-c89c-4f28-907e-25c4597b4a89');
INSERT INTO public.payments VALUES ('8df000df-050a-4f66-8c34-e4d52831c6ef', 240000, '2026-05-26 02:40:00', '2026-05-26 02:45:00', 'VNPAY', 'PAID', '00', 'VNPTXNac6c3972ae07494e', 'FFZ-SEED-ac6c3972ae07494e', 'ac6c3972-ae07-494e-8205-2bb957efc162');
INSERT INTO public.payments VALUES ('3966d4e0-5da8-460c-af56-6de4164e34f4', 290000, '2026-05-27 02:45:00', '2026-05-27 02:50:00', 'VNPAY', 'PAID', '00', 'VNPTXNa368dcfd1b4745b2', 'FFZ-SEED-a368dcfd1b4745b2', 'a368dcfd-1b47-45b2-87e3-6bbc62f84afc');
INSERT INTO public.payments VALUES ('14a51eaa-c999-4dc4-8b6a-72869cf49c32', 340000, '2026-05-27 02:50:00', '2026-05-27 02:55:00', 'VNPAY', 'PAID', '00', 'VNPTXN140bde43788d4378', 'FFZ-SEED-140bde43788d4378', '140bde43-788d-4378-a937-e0f681fb340c');
INSERT INTO public.payments VALUES ('55e8502d-ee09-4ee2-94fd-ae34a714adb4', 390000, '2026-05-27 02:55:00', '2026-05-27 03:00:00', 'VNPAY', 'PAID', '00', 'VNPTXNc272190ccb3845ce', 'FFZ-SEED-c272190ccb3845ce', 'c272190c-cb38-45ce-9b7e-caf8eeac0b2f');
INSERT INTO public.payments VALUES ('e2cf85cc-bd52-4b3a-bea7-d9fd4b1c1614', 240000, '2026-05-27 03:00:00', '2026-05-27 03:05:00', 'VNPAY', 'PAID', '00', 'VNPTXNbe3804d0431a49cf', 'FFZ-SEED-be3804d0431a49cf', 'be3804d0-431a-49cf-b450-b4d702e24920');
INSERT INTO public.payments VALUES ('7724c8a0-44df-439f-a7dd-f0dc0672ee67', 290000, '2026-05-27 03:05:00', '2026-05-27 03:10:00', 'VNPAY', 'PAID', '00', 'VNPTXN90914bc9e2d04789', 'FFZ-SEED-90914bc9e2d04789', '90914bc9-e2d0-4789-9bf6-8342a2fc4f51');
INSERT INTO public.payments VALUES ('143b4763-9c2e-4197-b4d1-832046dcbf5f', 340000, '2026-05-27 03:10:00', '2026-05-27 03:15:00', 'VNPAY', 'PAID', '00', 'VNPTXNc3d8509af939424b', 'FFZ-SEED-c3d8509af939424b', 'c3d8509a-f939-424b-83bb-f9a20c1cf685');
INSERT INTO public.payments VALUES ('0567b79b-804c-46c6-8dd7-54b13c6a512e', 390000, '2026-05-27 03:15:00', '2026-05-27 03:20:00', 'VNPAY', 'PAID', '00', 'VNPTXNed4b20da83af4d90', 'FFZ-SEED-ed4b20da83af4d90', 'ed4b20da-83af-4d90-9e19-832534646cf3');
INSERT INTO public.payments VALUES ('ebe79231-12c6-4ba9-abc1-562b98ba844b', 240000, '2026-05-27 03:20:00', '2026-05-27 03:25:00', 'VNPAY', 'PAID', '00', 'VNPTXN08b9ebc90eaf418a', 'FFZ-SEED-08b9ebc90eaf418a', '08b9ebc9-0eaf-418a-9eb3-bfc9135e15f0');
INSERT INTO public.payments VALUES ('2ea94ea0-12a8-4cd7-848d-781b4b63d705', 290000, '2026-05-28 03:25:00', '2026-05-28 03:30:00', 'VNPAY', 'PAID', '00', 'VNPTXN6234edac00ea43b7', 'FFZ-SEED-6234edac00ea43b7', '6234edac-00ea-43b7-91fd-e985b00e1b83');
INSERT INTO public.payments VALUES ('29ffbb7c-c65e-4209-81f9-83eee721b15b', 340000, '2026-05-28 03:30:00', '2026-05-28 03:35:00', 'VNPAY', 'PAID', '00', 'VNPTXN891442d8a2fa43dd', 'FFZ-SEED-891442d8a2fa43dd', '891442d8-a2fa-43dd-ab83-ae2c608c8bef');
INSERT INTO public.payments VALUES ('1e970dd7-830b-4a42-a570-5423392dff36', 390000, '2026-05-28 03:35:00', '2026-05-28 03:40:00', 'VNPAY', 'PAID', '00', 'VNPTXN4485b3f2453d48a5', 'FFZ-SEED-4485b3f2453d48a5', '4485b3f2-453d-48a5-8e02-015a512e191e');
INSERT INTO public.payments VALUES ('01273aac-fbb3-4ee7-b88e-e36c32631afe', 240000, '2026-05-28 03:40:00', '2026-05-28 03:45:00', 'VNPAY', 'PAID', '00', 'VNPTXN6f92824e676e44ac', 'FFZ-SEED-6f92824e676e44ac', '6f92824e-676e-44ac-8f5d-25e6a3c53962');
INSERT INTO public.payments VALUES ('ac6c445f-ca6d-4cb7-bdf9-5fa3fa69feca', 290000, '2026-05-28 03:45:00', '2026-05-28 03:50:00', 'VNPAY', 'PAID', '00', 'VNPTXN653cda97e9eb4204', 'FFZ-SEED-653cda97e9eb4204', '653cda97-e9eb-4204-a8de-ee4516429a17');
INSERT INTO public.payments VALUES ('0cc75a66-e4cf-4852-a65a-e4581e74aea2', 340000, '2026-05-28 03:50:00', '2026-05-28 03:55:00', 'VNPAY', 'PAID', '00', 'VNPTXN84da936aa24d43cf', 'FFZ-SEED-84da936aa24d43cf', '84da936a-a24d-43cf-9742-857f930915ce');
INSERT INTO public.payments VALUES ('cffb2439-673d-4106-9c22-4ee72178b83c', 390000, '2026-05-28 03:55:00', '2026-05-28 04:00:00', 'VNPAY', 'PAID', '00', 'VNPTXN03881fcf2d924f78', 'FFZ-SEED-03881fcf2d924f78', '03881fcf-2d92-4f78-a83f-5bfb16346280');
INSERT INTO public.payments VALUES ('92fd2dfa-e4d6-4456-a9d5-b63375b58192', 240000, '2026-05-28 04:00:00', '2026-05-28 04:05:00', 'VNPAY', 'PAID', '00', 'VNPTXN2a4494e509844c34', 'FFZ-SEED-2a4494e509844c34', '2a4494e5-0984-4c34-84e1-0fd0e62c78f1');
INSERT INTO public.payments VALUES ('31fae900-777b-4fc5-8a93-46a172f63fb9', 290000, '2026-05-29 04:05:00', '2026-05-29 04:10:00', 'VNPAY', 'PAID', '00', 'VNPTXN4cc61cd7083b4433', 'FFZ-SEED-4cc61cd7083b4433', '4cc61cd7-083b-4433-8322-6a0de80980f8');
INSERT INTO public.payments VALUES ('35c328a3-529e-4a55-a888-0d534aa8ed1d', 340000, '2026-05-29 04:10:00', '2026-05-29 04:15:00', 'VNPAY', 'PAID', '00', 'VNPTXN5f4ef0079fd0423a', 'FFZ-SEED-5f4ef0079fd0423a', '5f4ef007-9fd0-423a-861f-d929ef128718');
INSERT INTO public.payments VALUES ('c5d9dca3-d698-4071-9bf1-5b116296e50f', 390000, '2026-05-29 04:15:00', '2026-05-29 04:20:00', 'VNPAY', 'PAID', '00', 'VNPTXN49e477148b1d4a60', 'FFZ-SEED-49e477148b1d4a60', '49e47714-8b1d-4a60-aa16-cfbd3aeb02ed');
INSERT INTO public.payments VALUES ('61d5e67b-cc2d-496b-9e86-77c61bb3682d', 240000, '2026-05-29 04:20:00', '2026-05-29 04:25:00', 'VNPAY', 'PAID', '00', 'VNPTXN2bc4833c9a414996', 'FFZ-SEED-2bc4833c9a414996', '2bc4833c-9a41-4996-900e-993dfc3ed747');
INSERT INTO public.payments VALUES ('d3ed42ae-aab5-4f66-80c7-9054ba4a1575', 290000, '2026-05-29 04:25:00', '2026-05-29 04:30:00', 'VNPAY', 'PAID', '00', 'VNPTXN7eccb41542614cf3', 'FFZ-SEED-7eccb41542614cf3', '7eccb415-4261-4cf3-86bf-adb56e52172f');
INSERT INTO public.payments VALUES ('4adc79c4-b19c-45df-9665-2169e9c327e6', 340000, '2026-05-29 04:30:00', '2026-05-29 04:35:00', 'VNPAY', 'PAID', '00', 'VNPTXNaa19b604aee74643', 'FFZ-SEED-aa19b604aee74643', 'aa19b604-aee7-4643-b343-d96026a5d3d6');
INSERT INTO public.payments VALUES ('86682315-5f16-423c-9114-839c806c986e', 390000, '2026-05-29 04:35:00', '2026-05-29 04:40:00', 'VNPAY', 'PAID', '00', 'VNPTXN110aa90736a44989', 'FFZ-SEED-110aa90736a44989', '110aa907-36a4-4989-b0b5-d91eccf5d5d7');
INSERT INTO public.payments VALUES ('206de928-9c72-4fbc-b406-2f3480ec3d4e', 240000, '2026-05-29 04:40:00', '2026-05-29 04:45:00', 'VNPAY', 'PAID', '00', 'VNPTXN52d4ec9783b64773', 'FFZ-SEED-52d4ec9783b64773', '52d4ec97-83b6-4773-b6ce-524812853692');
INSERT INTO public.payments VALUES ('a3e7fd6d-b14f-4bf0-804c-0ba967cfcca1', 350000, '2026-05-30 04:45:00', '2026-05-30 04:50:00', 'VNPAY', 'PAID', '00', 'VNPTXN9089dfd9ffae4397', 'FFZ-SEED-9089dfd9ffae4397', '9089dfd9-ffae-4397-ae43-3a6aee63e6ff');
INSERT INTO public.payments VALUES ('97d590bb-7a83-481a-8e01-bcb3d05ab38a', 400000, '2026-05-30 04:50:00', '2026-05-30 04:55:00', 'VNPAY', 'PAID', '00', 'VNPTXNb3ae219e3f42488e', 'FFZ-SEED-b3ae219e3f42488e', 'b3ae219e-3f42-488e-b9da-923da480a233');
INSERT INTO public.payments VALUES ('e350c0df-115e-479d-8cb4-450651cf2085', 450000, '2026-05-30 04:55:00', '2026-05-30 05:00:00', 'VNPAY', 'PAID', '00', 'VNPTXNd4fb8290cb2b4e09', 'FFZ-SEED-d4fb8290cb2b4e09', 'd4fb8290-cb2b-4e09-a008-48eeb855edb5');
INSERT INTO public.payments VALUES ('c227ea1d-0210-4cea-a532-96ce457a5310', 300000, '2026-05-30 05:00:00', '2026-05-30 05:05:00', 'VNPAY', 'PAID', '00', 'VNPTXN2797ce1fc7144990', 'FFZ-SEED-2797ce1fc7144990', '2797ce1f-c714-4990-8f8d-9a1861e35918');
INSERT INTO public.payments VALUES ('626b4c3c-2872-4850-8931-54910241b997', 350000, '2026-05-30 05:05:00', '2026-05-30 05:10:00', 'VNPAY', 'PAID', '00', 'VNPTXNe2e7eb7ed4a74010', 'FFZ-SEED-e2e7eb7ed4a74010', 'e2e7eb7e-d4a7-4010-ab9f-4717a7f95f99');
INSERT INTO public.payments VALUES ('21ae7288-4081-4afd-93ce-e8f3eb9bdf3b', 400000, '2026-05-30 05:10:00', '2026-05-30 05:15:00', 'VNPAY', 'PAID', '00', 'VNPTXN443d98244be847bf', 'FFZ-SEED-443d98244be847bf', '443d9824-4be8-47bf-9dee-2a1a514a97c0');
INSERT INTO public.payments VALUES ('2529d961-494b-46ef-aaf5-39c16c8456f3', 450000, '2026-05-30 05:15:00', '2026-05-30 05:20:00', 'VNPAY', 'PAID', '00', 'VNPTXN7f23a971744d4c03', 'FFZ-SEED-7f23a971744d4c03', '7f23a971-744d-4c03-b927-de2ac22c9d6b');
INSERT INTO public.payments VALUES ('d4f9de9d-245a-4ba4-9503-c43c56c59d77', 300000, '2026-05-30 05:20:00', '2026-05-30 05:25:00', 'VNPAY', 'PAID', '00', 'VNPTXNbc33635e8b3a4964', 'FFZ-SEED-bc33635e8b3a4964', 'bc33635e-8b3a-4964-bcc9-4c6aef11f712');
INSERT INTO public.payments VALUES ('85702ef1-a08b-411d-9040-5168089ef5bf', 350000, '2026-05-31 05:25:00', '2026-05-31 05:30:00', 'VNPAY', 'PAID', '00', 'VNPTXNc357c3ac5ec64f1d', 'FFZ-SEED-c357c3ac5ec64f1d', 'c357c3ac-5ec6-4f1d-ab97-9e8a3d8e7595');
INSERT INTO public.payments VALUES ('47c44740-c745-4383-9548-c0b8a581b8b9', 400000, '2026-05-31 05:30:00', '2026-05-31 05:35:00', 'VNPAY', 'PAID', '00', 'VNPTXN7c5e1dad10624d6d', 'FFZ-SEED-7c5e1dad10624d6d', '7c5e1dad-1062-4d6d-bb72-8c458a8196bb');
INSERT INTO public.payments VALUES ('b6901fa8-f1b7-419a-b56e-d3debf6b9ad3', 450000, '2026-05-31 05:35:00', '2026-05-31 05:40:00', 'VNPAY', 'PAID', '00', 'VNPTXNc225cc564232417f', 'FFZ-SEED-c225cc564232417f', 'c225cc56-4232-417f-8d8d-22d330e15225');
INSERT INTO public.payments VALUES ('a2b728c4-f50d-4a2c-82c9-06f1651000fc', 300000, '2026-05-31 05:40:00', '2026-05-31 05:45:00', 'VNPAY', 'PAID', '00', 'VNPTXNeae815eaac594a9a', 'FFZ-SEED-eae815eaac594a9a', 'eae815ea-ac59-4a9a-9e66-9f0f64662f81');
INSERT INTO public.payments VALUES ('837e1571-3399-4a7a-8c92-d420b612c126', 350000, '2026-05-31 05:45:00', '2026-05-31 05:50:00', 'VNPAY', 'PAID', '00', 'VNPTXNc354698e1e924a01', 'FFZ-SEED-c354698e1e924a01', 'c354698e-1e92-4a01-a068-0798eb035585');
INSERT INTO public.payments VALUES ('219f9d96-af52-4099-ab18-79e55db7682a', 400000, '2026-05-31 05:50:00', '2026-05-31 05:55:00', 'VNPAY', 'PAID', '00', 'VNPTXNedd06f2eb6ed4d49', 'FFZ-SEED-edd06f2eb6ed4d49', 'edd06f2e-b6ed-4d49-8a9f-961f4e03ae14');
INSERT INTO public.payments VALUES ('8f6ecd0b-3a7b-4ee2-a42b-a7ae172836fa', 450000, '2026-05-31 05:55:00', '2026-05-31 06:00:00', 'VNPAY', 'PAID', '00', 'VNPTXN3e93849a31034ed3', 'FFZ-SEED-3e93849a31034ed3', '3e93849a-3103-4ed3-8626-17b273f76cc2');
INSERT INTO public.payments VALUES ('adc3a140-4f13-45ec-b952-8902226f2e1e', 300000, '2026-05-31 06:00:00', '2026-05-31 06:05:00', 'VNPAY', 'PAID', '00', 'VNPTXNbee3997ae8ac4a10', 'FFZ-SEED-bee3997ae8ac4a10', 'bee3997a-e8ac-4a10-b8bf-c9ff0b24072a');
INSERT INTO public.payments VALUES ('676e4fc0-9a42-4aa0-a927-f90fd15f7316', 290000, '2026-06-01 06:05:00', '2026-06-01 06:10:00', 'VNPAY', 'PAID', '00', 'VNPTXN57d5054e6b014a06', 'FFZ-SEED-57d5054e6b014a06', '57d5054e-6b01-4a06-81f0-f393a189ca35');
INSERT INTO public.payments VALUES ('e7e0b465-13d9-45a9-a3ae-f1f730cfd14e', 340000, '2026-06-01 06:10:00', '2026-06-01 06:15:00', 'VNPAY', 'PAID', '00', 'VNPTXNf4bc3ad8475644bf', 'FFZ-SEED-f4bc3ad8475644bf', 'f4bc3ad8-4756-44bf-827e-4c094506a3e8');
INSERT INTO public.payments VALUES ('186501c2-a62f-4acf-b726-ab6a02148e36', 390000, '2026-06-01 06:15:00', '2026-06-01 06:20:00', 'VNPAY', 'PAID', '00', 'VNPTXN50dfe1f02cc94f29', 'FFZ-SEED-50dfe1f02cc94f29', '50dfe1f0-2cc9-4f29-a70a-2e9687c410b8');
INSERT INTO public.payments VALUES ('88c538fb-da6c-4142-9429-a25904359b8f', 240000, '2026-06-01 06:20:00', '2026-06-01 06:25:00', 'VNPAY', 'PAID', '00', 'VNPTXNa0a657bfc0d14b3d', 'FFZ-SEED-a0a657bfc0d14b3d', 'a0a657bf-c0d1-4b3d-a6de-af99df2629b8');
INSERT INTO public.payments VALUES ('77021669-70b0-4bf9-90b2-533132a64059', 290000, '2026-06-01 06:25:00', '2026-06-01 06:30:00', 'VNPAY', 'PAID', '00', 'VNPTXNceca02c39fc14cc8', 'FFZ-SEED-ceca02c39fc14cc8', 'ceca02c3-9fc1-4cc8-9390-5df2f76992c1');
INSERT INTO public.payments VALUES ('2884f62b-b9f6-490b-95ec-30a6941331a1', 340000, '2026-06-01 06:30:00', '2026-06-01 06:35:00', 'VNPAY', 'PAID', '00', 'VNPTXN9af421f9445f4343', 'FFZ-SEED-9af421f9445f4343', '9af421f9-445f-4343-9e3c-fbb74f685ef4');
INSERT INTO public.payments VALUES ('e1d3ae38-237d-4727-943e-d37f3f602c3e', 390000, '2026-06-01 06:35:00', '2026-06-01 06:40:00', 'VNPAY', 'PAID', '00', 'VNPTXNa0cdefee05974ee5', 'FFZ-SEED-a0cdefee05974ee5', 'a0cdefee-0597-4ee5-b357-0a3c902c28bd');
INSERT INTO public.payments VALUES ('a4ac5527-740e-461f-a376-970f8e4606c1', 240000, '2026-06-01 06:40:00', '2026-06-01 06:45:00', 'VNPAY', 'PAID', '00', 'VNPTXN826f4e45a3da4e4a', 'FFZ-SEED-826f4e45a3da4e4a', '826f4e45-a3da-4e4a-b3ff-93088214e86f');
INSERT INTO public.payments VALUES ('c339edef-f50b-4d39-ae76-4d6f70bc2e58', 290000, '2026-06-02 06:45:00', '2026-06-02 06:50:00', 'VNPAY', 'PAID', '00', 'VNPTXN9f501b5322d44a82', 'FFZ-SEED-9f501b5322d44a82', '9f501b53-22d4-4a82-93f4-a3d7a9b059d8');
INSERT INTO public.payments VALUES ('2d4632a3-fa3b-4804-ac3d-452aa9d072e1', 340000, '2026-06-02 06:50:00', '2026-06-02 06:55:00', 'VNPAY', 'PAID', '00', 'VNPTXN4e87e2b749b14bbe', 'FFZ-SEED-4e87e2b749b14bbe', '4e87e2b7-49b1-4bbe-b55f-66aa90ed2f96');
INSERT INTO public.payments VALUES ('6c7de2b6-3629-4d2b-a89e-fc4f264b43eb', 390000, '2026-06-02 06:55:00', '2026-06-02 07:00:00', 'VNPAY', 'PAID', '00', 'VNPTXNefe671edcd08435d', 'FFZ-SEED-efe671edcd08435d', 'efe671ed-cd08-435d-bf13-48f9f8e29df3');
INSERT INTO public.payments VALUES ('2486870a-1e3c-4d10-9a0c-7d39124e8c9e', 240000, '2026-06-02 07:00:00', '2026-06-02 07:05:00', 'VNPAY', 'PAID', '00', 'VNPTXN84529d2a146e408d', 'FFZ-SEED-84529d2a146e408d', '84529d2a-146e-408d-95ff-7e935cca462b');
INSERT INTO public.payments VALUES ('696004bf-e96b-4011-abbc-70bb5f02540e', 290000, '2026-06-02 07:05:00', '2026-06-02 07:10:00', 'VNPAY', 'PAID', '00', 'VNPTXNddcce2a821f94481', 'FFZ-SEED-ddcce2a821f94481', 'ddcce2a8-21f9-4481-aeec-7820e4a44de9');
INSERT INTO public.payments VALUES ('0fb4b482-f8f3-4c90-8dc5-8e524822446d', 340000, '2026-06-02 07:10:00', '2026-06-02 07:15:00', 'VNPAY', 'PAID', '00', 'VNPTXN12c4f519a5a94598', 'FFZ-SEED-12c4f519a5a94598', '12c4f519-a5a9-4598-9909-24c29e4bf9fa');
INSERT INTO public.payments VALUES ('78b396d8-e1e6-466d-aec8-5776fbe5a55a', 390000, '2026-06-02 07:15:00', '2026-06-02 07:20:00', 'VNPAY', 'PAID', '00', 'VNPTXNad21de2132064334', 'FFZ-SEED-ad21de2132064334', 'ad21de21-3206-4334-8e4d-2acca0b350fc');
INSERT INTO public.payments VALUES ('10d18955-618e-444c-b6b7-ca4f743c7e0f', 240000, '2026-06-02 07:20:00', '2026-06-02 07:25:00', 'VNPAY', 'PAID', '00', 'VNPTXN282fab035fc44b68', 'FFZ-SEED-282fab035fc44b68', '282fab03-5fc4-4b68-b43f-76d25cebd640');
INSERT INTO public.payments VALUES ('5c9c2aa5-e487-4257-98fe-48b0e07bf24f', 290000, '2026-06-03 07:25:00', '2026-06-03 07:30:00', 'VNPAY', 'PAID', '00', 'VNPTXNf3e0c0b33058430c', 'FFZ-SEED-f3e0c0b33058430c', 'f3e0c0b3-3058-430c-966b-b33f2e2034e9');
INSERT INTO public.payments VALUES ('3e72c76b-a710-4b0c-8e5f-4660d18d39b3', 340000, '2026-06-03 07:30:00', '2026-06-03 07:35:00', 'VNPAY', 'PAID', '00', 'VNPTXNd94aa3dad1a44b2b', 'FFZ-SEED-d94aa3dad1a44b2b', 'd94aa3da-d1a4-4b2b-9dd7-9e24b1e71ec4');
INSERT INTO public.payments VALUES ('62481e3e-57a4-47a3-90e5-326fae57d187', 390000, '2026-06-03 07:35:00', '2026-06-03 07:40:00', 'VNPAY', 'PAID', '00', 'VNPTXN27b3854f8b5749b6', 'FFZ-SEED-27b3854f8b5749b6', '27b3854f-8b57-49b6-9d95-1e40fa07936a');
INSERT INTO public.payments VALUES ('c30dd60f-a21d-4e87-aebd-4048a9f8fe6c', 240000, '2026-06-03 07:40:00', '2026-06-03 07:45:00', 'VNPAY', 'PAID', '00', 'VNPTXN9bcd5825a3c64b63', 'FFZ-SEED-9bcd5825a3c64b63', '9bcd5825-a3c6-4b63-bee6-5033d458ae6b');
INSERT INTO public.payments VALUES ('0638da0e-c3bd-408e-a795-c88ab384952d', 290000, '2026-06-03 07:45:00', '2026-06-03 07:50:00', 'VNPAY', 'PAID', '00', 'VNPTXN92cf884d87084dd9', 'FFZ-SEED-92cf884d87084dd9', '92cf884d-8708-4dd9-a005-0eeab730bec5');
INSERT INTO public.payments VALUES ('7a73e821-a0c3-446d-945e-97a270f32b7b', 340000, '2026-06-03 07:50:00', '2026-06-03 07:55:00', 'VNPAY', 'PAID', '00', 'VNPTXNa293fc8043a74244', 'FFZ-SEED-a293fc8043a74244', 'a293fc80-43a7-4244-bc1c-dd96b45d51ba');
INSERT INTO public.payments VALUES ('0fde4cd5-67ca-4b9a-b24b-7953ac3735c4', 390000, '2026-06-03 07:55:00', '2026-06-03 08:00:00', 'VNPAY', 'PAID', '00', 'VNPTXN03aac4b984864a34', 'FFZ-SEED-03aac4b984864a34', '03aac4b9-8486-4a34-b2e3-fd251d6d191c');
INSERT INTO public.payments VALUES ('cf1883dc-c48a-49dc-94a3-21189b834017', 240000, '2026-06-03 08:00:00', '2026-06-03 08:05:00', 'VNPAY', 'PAID', '00', 'VNPTXNc411c1e924454298', 'FFZ-SEED-c411c1e924454298', 'c411c1e9-2445-4298-b89b-c778efdf824e');
INSERT INTO public.payments VALUES ('55299c24-b231-4b9b-9de1-a657b8f0dac4', 290000, '2026-06-04 08:05:00', '2026-06-04 08:10:00', 'VNPAY', 'PAID', '00', 'VNPTXN3c7b27bbb8074f9c', 'FFZ-SEED-3c7b27bbb8074f9c', '3c7b27bb-b807-4f9c-83fd-914d79b9f3e1');
INSERT INTO public.payments VALUES ('e1f4379c-27d5-4b35-8168-bec2a1c6e21f', 340000, '2026-06-04 08:10:00', '2026-06-04 08:15:00', 'VNPAY', 'PAID', '00', 'VNPTXN782c03350d114c25', 'FFZ-SEED-782c03350d114c25', '782c0335-0d11-4c25-a263-5a0e668f7421');
INSERT INTO public.payments VALUES ('0fe1df52-341e-452d-9fa5-bba79ce7fef2', 390000, '2026-06-04 08:15:00', '2026-06-04 08:20:00', 'VNPAY', 'PAID', '00', 'VNPTXN173cc27633654e04', 'FFZ-SEED-173cc27633654e04', '173cc276-3365-4e04-8947-067c520c438f');
INSERT INTO public.payments VALUES ('9c77f69e-47ee-49b4-8109-c1632d3f8df7', 240000, '2026-06-04 08:20:00', '2026-06-04 08:25:00', 'VNPAY', 'PAID', '00', 'VNPTXNab029a23e8c14dea', 'FFZ-SEED-ab029a23e8c14dea', 'ab029a23-e8c1-4dea-b0ef-18975668ad85');
INSERT INTO public.payments VALUES ('3af5a5f3-14ac-41fc-8db0-a42f6be4dee8', 290000, '2026-06-04 08:25:00', '2026-06-04 08:30:00', 'VNPAY', 'PAID', '00', 'VNPTXN1f7e375cb3284b77', 'FFZ-SEED-1f7e375cb3284b77', '1f7e375c-b328-4b77-8671-35061a869fe3');
INSERT INTO public.payments VALUES ('a5d7db45-d3d2-48b4-b9b6-93e2e369a711', 340000, '2026-06-04 08:30:00', '2026-06-04 08:35:00', 'VNPAY', 'PAID', '00', 'VNPTXN94b69a4f2dfd4a23', 'FFZ-SEED-94b69a4f2dfd4a23', '94b69a4f-2dfd-4a23-a0c4-82ca98e7a899');
INSERT INTO public.payments VALUES ('80ca5908-df0c-406a-b781-f23380cbd55b', 390000, '2026-06-04 08:35:00', '2026-06-04 08:40:00', 'VNPAY', 'PAID', '00', 'VNPTXNbeaf3b5d959346fb', 'FFZ-SEED-beaf3b5d959346fb', 'beaf3b5d-9593-46fb-bc01-65a9b402406b');
INSERT INTO public.payments VALUES ('d4c08d90-ee5d-4f01-9f7a-9b22446d7408', 240000, '2026-06-04 08:40:00', '2026-06-04 08:45:00', 'VNPAY', 'PAID', '00', 'VNPTXN9d93f8abc82146fb', 'FFZ-SEED-9d93f8abc82146fb', '9d93f8ab-c821-46fb-a28d-892c9ff9e727');
INSERT INTO public.payments VALUES ('10b9333a-e896-405c-9a05-a3b0de974b32', 290000, '2026-06-05 08:45:00', '2026-06-05 08:50:00', 'VNPAY', 'PAID', '00', 'VNPTXNc39c354139eb4881', 'FFZ-SEED-c39c354139eb4881', 'c39c3541-39eb-4881-b9bc-52a805f5989d');
INSERT INTO public.payments VALUES ('9e50dc3a-88d1-464c-854d-bb1419e8528e', 340000, '2026-06-05 08:50:00', '2026-06-05 08:55:00', 'VNPAY', 'PAID', '00', 'VNPTXN86b03f1fd1974cf7', 'FFZ-SEED-86b03f1fd1974cf7', '86b03f1f-d197-4cf7-9fb5-48367148666b');
INSERT INTO public.payments VALUES ('7b570bc4-bf46-4152-a452-2238475daddf', 390000, '2026-06-05 08:55:00', '2026-06-05 09:00:00', 'VNPAY', 'PAID', '00', 'VNPTXNbe47215d46284d64', 'FFZ-SEED-be47215d46284d64', 'be47215d-4628-4d64-8fdd-547072a6b875');
INSERT INTO public.payments VALUES ('efdf44ad-9f04-4dbf-9029-7eacf557be1a', 240000, '2026-06-05 09:00:00', '2026-06-05 09:05:00', 'VNPAY', 'PAID', '00', 'VNPTXNb811879878084ef8', 'FFZ-SEED-b811879878084ef8', 'b8118798-7808-4ef8-b09e-d616a6f22054');
INSERT INTO public.payments VALUES ('f258df55-6098-4601-b68f-bea59fbcb79f', 290000, '2026-06-05 09:05:00', '2026-06-05 09:10:00', 'VNPAY', 'PAID', '00', 'VNPTXN09f4b7e2eb4f402d', 'FFZ-SEED-09f4b7e2eb4f402d', '09f4b7e2-eb4f-402d-8aa9-269b101cd1fd');
INSERT INTO public.payments VALUES ('2a786db6-9bc4-4879-9d98-cd5e3f36bd84', 340000, '2026-06-05 09:10:00', '2026-06-05 09:15:00', 'VNPAY', 'PAID', '00', 'VNPTXN8df4e4afec664d21', 'FFZ-SEED-8df4e4afec664d21', '8df4e4af-ec66-4d21-af9a-58ac3ab2c5d9');
INSERT INTO public.payments VALUES ('6c5246b8-a6a5-4d21-a408-c01c92c57927', 390000, '2026-06-05 09:15:00', '2026-06-05 09:20:00', 'VNPAY', 'PAID', '00', 'VNPTXN2264adeb082a493a', 'FFZ-SEED-2264adeb082a493a', '2264adeb-082a-493a-87c2-f2739dae0d7e');
INSERT INTO public.payments VALUES ('cf0e5994-0bb1-4597-9ac0-c3e327c43407', 240000, '2026-06-05 09:20:00', '2026-06-05 09:25:00', 'VNPAY', 'PAID', '00', 'VNPTXN100a6e3dee054f75', 'FFZ-SEED-100a6e3dee054f75', '100a6e3d-ee05-4f75-98ab-2b193b2cff0c');
INSERT INTO public.payments VALUES ('58c9eb9c-c883-4e6d-87fc-392d47b706cc', 350000, '2026-06-06 09:25:00', '2026-06-06 09:30:00', 'VNPAY', 'PAID', '00', 'VNPTXNc938e123238e42d1', 'FFZ-SEED-c938e123238e42d1', 'c938e123-238e-42d1-b82a-8a5176d62bf9');
INSERT INTO public.payments VALUES ('7531bc84-9cf7-4116-8b88-f5a020b3e3aa', 400000, '2026-06-06 09:30:00', '2026-06-06 09:35:00', 'VNPAY', 'PAID', '00', 'VNPTXNd0a5cff369294ff9', 'FFZ-SEED-d0a5cff369294ff9', 'd0a5cff3-6929-4ff9-8d2c-2860d23cd421');
INSERT INTO public.payments VALUES ('2668e2c1-5d0a-460b-8c23-75065100e4f0', 432000, '2026-07-13 18:18:58.841543', NULL, 'VNPAY', 'PENDING', NULL, NULL, 'FFZ-20260713-2187-1783941538826', 'd702d6d1-a7ec-4d4e-aa92-6585ad0d288d');
INSERT INTO public.payments VALUES ('7b14cb73-fa0a-4a71-ad87-9ad4f57c64bf', 200000, '2026-07-13 18:20:54.143381', NULL, 'VNPAY', 'PENDING', NULL, NULL, 'FFZ-20260713-2123-1783941654140', 'd3e5e90b-7421-4733-9cfe-ecd47f81f695');
INSERT INTO public.payments VALUES ('0871f6c1-f77f-4808-afb5-6a5fe592b834', 200000, '2026-07-13 18:24:13.450086', NULL, 'VNPAY', 'PENDING', NULL, NULL, 'FFZ-20260713-5080-1783941853446', '4ec5bf67-ea0b-4f46-b0ca-fcf15329dbbb');
INSERT INTO public.payments VALUES ('040426f7-6847-4d62-9262-2e8aa40c41eb', 200000, '2026-07-13 18:36:25.556393', NULL, 'VNPAY', 'PENDING', NULL, NULL, 'FFZ-20260713-6510-1783942585542', 'f1e6abbb-40b9-4af4-a65c-afea154e4d35');


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: public; Owner: ffzone
--



--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.services VALUES ('4ff84af8-c3e2-4ac4-b2d5-c108efad20a7', NULL, 'Áo bib phân biệt đội, 1 bộ 14 chiếc', 'uploads/service-images/08642a0b-7f24-413c-ad0e-a4c50238905f.jpg', true, 'Áo bib', 50000, 'EQUIPMENT');
INSERT INTO public.services VALUES ('ca084987-97a4-42b1-a641-0d6c0e24ac57', '2026-06-19 14:07:45.271084', NULL, 'uploads/service-images/0332b182-d886-4452-bb07-d236ce23b41c.jpg', true, 'String đỏ', 20000, 'DRINK');
INSERT INTO public.services VALUES ('648baf9a-8682-496d-826a-e10215152bbd', NULL, 'Nước suối Aquafina 500ml', 'uploads/service-images/e11140be-9fd4-4858-8746-de705a947397.jpg', true, 'Nước suối', 10000, 'DRINK');
INSERT INTO public.services VALUES ('d4b94399-9978-4498-988e-caee9d4aa2e2', NULL, 'Bóng đá size 5 tiêu chuẩn FIFA', 'uploads/service-images/89a56c82-84cc-4164-9366-b50c9f0ec40a.webp', true, 'Thuê bóng thi đấu', 50000, 'FACILITY');
INSERT INTO public.services VALUES ('c7a35ed4-f9dd-4fec-b8cf-496cd7a5ed52', '2026-06-29 10:25:22.991297', NULL, 'uploads/service-images/c7cf341b-7d1b-43c9-a82a-52794dd724fd.jpg', true, 'Redbull', 15000, 'DRINK');
INSERT INTO public.services VALUES ('4471d2cf-8e8c-402e-8b58-9bf4bbfe0bdb', '2026-06-29 10:26:08.6528', NULL, 'uploads/service-images/ca0005c5-2e8a-42ab-a2c7-0d9d4d8e136b.webp', true, 'Pocari', 20000, 'DRINK');
INSERT INTO public.services VALUES ('51fa21e3-fcc3-4050-9253-65ae944c1b43', '2026-06-29 10:26:52.632809', NULL, 'uploads/service-images/b24f4aa9-5037-4d15-b051-b69b44947a96.jpg', true, 'Pepsi', 15000, 'DRINK');
INSERT INTO public.services VALUES ('8fa2dc5a-a3d5-4d79-a576-4ad88bc6c86c', '2026-06-29 10:27:42.580558', NULL, 'uploads/service-images/328b217b-4609-4c10-bff9-b9da636acfc1.jpg', true, '7Up', 15000, 'DRINK');
INSERT INTO public.services VALUES ('257cd83c-1d60-4756-9034-afc747f4a25f', '2026-06-29 10:35:05.784137', '1 bộ 3 cái', 'uploads/service-images/a7227e44-2cc6-4fc5-adca-be2d179094a9.jpg', true, 'Bông cổ vũ', 50000, 'EQUIPMENT');
INSERT INTO public.services VALUES ('b2a8a30e-6792-42aa-aade-08097fd2ae31', '2026-06-29 10:35:50.179443', NULL, 'uploads/service-images/9fc7fdbc-ef33-4f5e-896c-5b6d3ef75643.jpg', true, 'Còi cổ vũ', 50000, 'EQUIPMENT');


--
-- Data for Name: user_vouchers; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.user_vouchers VALUES ('889b6950-4645-4ee9-99be-eb89529c0242', '2026-06-24 17:18:40.08102', false, NULL, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '7ed4f712-992f-4d3b-9747-f0d6f4999601');
INSERT INTO public.user_vouchers VALUES ('5ae888a6-3daa-4ba1-9e0f-82843b8b9e56', '2026-06-24 17:26:30.914865', false, NULL, '1c986827-4d49-41f8-9e7b-e060b5e2bdb4', '6a2b5151-c55b-4965-ae52-b7dcac3fde27');
INSERT INTO public.user_vouchers VALUES ('943b07a5-ae9b-4a15-8e59-6eadb91ccc45', '2026-06-24 17:26:35.021382', false, NULL, '1c986827-4d49-41f8-9e7b-e060b5e2bdb4', 'f28a30fb-223b-406b-b421-abbf0e7943f6');
INSERT INTO public.user_vouchers VALUES ('8005ce75-1181-463c-8224-05d3a31e1944', '2026-06-24 20:39:07.767844', false, NULL, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '8eacfc0f-6342-4bb2-91b6-a0be3b4173d4');
INSERT INTO public.user_vouchers VALUES ('7c1c7f22-b2b5-43b0-a65d-6fd5cdb766de', '2026-06-24 21:08:24.643878', false, NULL, '91fdd23f-85e6-4f0e-9a90-3ece244e33f6', 'f28a30fb-223b-406b-b421-abbf0e7943f6');
INSERT INTO public.user_vouchers VALUES ('f108725b-f130-47ed-b406-7023bc0dc574', '2026-06-24 21:08:26.475148', false, NULL, '91fdd23f-85e6-4f0e-9a90-3ece244e33f6', '6a2b5151-c55b-4965-ae52-b7dcac3fde27');
INSERT INTO public.user_vouchers VALUES ('71ee95d0-48d4-42d1-ab04-8b31cdbba828', '2026-06-26 13:10:32.245876', false, NULL, 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', 'f28a30fb-223b-406b-b421-abbf0e7943f6');
INSERT INTO public.user_vouchers VALUES ('2e5f0a12-c797-4db9-b613-7554fed726e8', '2026-06-26 13:10:28.313885', true, '2026-06-26 13:58:59.661453', 'c5ce5246-b72f-4a9e-91ba-e7fe71426166', '6a2b5151-c55b-4965-ae52-b7dcac3fde27');
INSERT INTO public.user_vouchers VALUES ('98866106-f9b5-4907-a917-b53eb24eccc0', '2026-06-24 13:12:02.526982', true, '2026-06-27 16:50:39.930647', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', 'f28a30fb-223b-406b-b421-abbf0e7943f6');
INSERT INTO public.user_vouchers VALUES ('9cc6d4ee-54e0-4d6a-98a0-d5d2360ee954', '2026-06-28 16:35:23.584638', false, NULL, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '2514f5e4-ae5a-44d8-be4c-6ffd4c9ea5a4');
INSERT INTO public.user_vouchers VALUES ('c70846f1-4676-467a-95de-3aa5a0879dac', '2026-06-29 18:26:00.112012', false, NULL, 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', 'c47061ce-b224-4286-a2f2-ea3805d5c4d0');
INSERT INTO public.user_vouchers VALUES ('daa9924a-bf41-4cdf-8bc2-7de4d7d7ea05', '2026-06-24 13:11:43.049883', true, '2026-07-13 18:18:58.645119', 'bbef5d67-906e-4f73-ba74-3f8ca1efc59e', '6a2b5151-c55b-4965-ae52-b7dcac3fde27');


--
-- Data for Name: vouchers; Type: TABLE DATA; Schema: public; Owner: ffzone
--

INSERT INTO public.vouchers VALUES ('7ed4f712-992f-4d3b-9747-f0d6f4999601', 'HEHE', '2026-06-23 18:35:10.202333', 50, '2026-06-24 18:35:00', 1, '2026-06-22 18:35:00', 'INACTIVE', 1, 'PERCENT');
INSERT INTO public.vouchers VALUES ('8eacfc0f-6342-4bb2-91b6-a0be3b4173d4', 'NGHĨ HÈ', '2026-06-23 18:32:58.210159', 50, '2026-06-25 18:32:00', 1, '2026-06-24 18:32:00', 'INACTIVE', 1, 'PERCENT');
INSERT INTO public.vouchers VALUES ('2514f5e4-ae5a-44d8-be4c-6ffd4c9ea5a4', 'HR', '2026-06-28 15:19:48.469336', 60000, '2026-06-30 15:19:00', 2, '2026-06-27 15:19:00', 'EXPIRED', 1, 'FIXED');
INSERT INTO public.vouchers VALUES ('c47061ce-b224-4286-a2f2-ea3805d5c4d0', 'HEHE1', '2026-06-29 18:25:20.20837', 50, '2026-06-30 18:25:00', 1, '2026-06-29 18:25:00', 'EXPIRED', 1, 'PERCENT');
INSERT INTO public.vouchers VALUES ('f28a30fb-223b-406b-b421-abbf0e7943f6', 'FLAT50K', '2026-06-16 11:07:10.348159', 50000, '2026-07-01 11:07:10.348159', 50, '2026-06-16 11:07:10.348159', 'EXPIRED', 4, 'FIXED');
INSERT INTO public.vouchers VALUES ('58aec59a-7450-41ec-b1b6-9c0c7653e8f3', 'HEHE2', '2026-06-29 18:25:34.799024', 50, '2026-07-01 18:25:00', 1, '2026-06-30 18:25:00', 'EXPIRED', 0, 'PERCENT');
INSERT INTO public.vouchers VALUES ('f89824cd-01d8-43f8-82ae-466ebd1de956', 'SUMMER', '2026-06-25 07:44:46.625862', 30, '2026-07-05 07:44:00', 5, '2026-07-01 07:44:00', 'EXPIRED', 0, 'PERCENT');
INSERT INTO public.vouchers VALUES ('6a2b5151-c55b-4965-ae52-b7dcac3fde27', 'WELCOME10', '2026-06-16 11:07:10.348159', 10, '2026-07-16 11:07:10.348159', 100, '2026-06-16 11:07:10.348159', 'ACTIVE', 4, 'PERCENT');


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: booking_services booking_services_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT booking_services_pkey PRIMARY KEY (id);


--
-- Name: booking_slots booking_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT booking_slots_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: field_images field_images_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_images
    ADD CONSTRAINT field_images_pkey PRIMARY KEY (id);


--
-- Name: field_pricing field_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_pricing
    ADD CONSTRAINT field_pricing_pkey PRIMARY KEY (id);


--
-- Name: field_slots field_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_slots
    ADD CONSTRAINT field_slots_pkey PRIMARY KEY (id);


--
-- Name: fields fields_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: field_slots uk2d5qe04dtdrhewmpcdfpyel7r; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_slots
    ADD CONSTRAINT uk2d5qe04dtdrhewmpcdfpyel7r UNIQUE (field_id, slot_date, start_time);


--
-- Name: vouchers uk30ftp2biebbvpik8e49wlmady; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT uk30ftp2biebbvpik8e49wlmady UNIQUE (code);


--
-- Name: user_vouchers uk3uel7gply4jtr6woe1xxjd8br; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.user_vouchers
    ADD CONSTRAINT uk3uel7gply4jtr6woe1xxjd8br UNIQUE (account_id, voucher_id);


--
-- Name: booking_slots uk3wcht6c3ke16gxm7pho6honvr; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT uk3wcht6c3ke16gxm7pho6honvr UNIQUE (field_slot_id);


--
-- Name: account ukdgdnj692f2g5ebicy1xyc2l3w; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT ukdgdnj692f2g5ebicy1xyc2l3w UNIQUE (phone);


--
-- Name: cart_items ukgb7rx22y2h0n0vnf2glx5ug5x; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT ukgb7rx22y2h0n0vnf2glx5ug5x UNIQUE (cart_id, service_id);


--
-- Name: refunds ukgpmjo1vi0o8sksmo0gkygjvc8; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT ukgpmjo1vi0o8sksmo0gkygjvc8 UNIQUE (booking_id);


--
-- Name: carts ukhc9hwyept723lo4fhhylwmnmr; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT ukhc9hwyept723lo4fhhylwmnmr UNIQUE (account_id);


--
-- Name: fields ukid7n84bwas9efabu1jb46dqx1; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT ukid7n84bwas9efabu1jb46dqx1 UNIQUE (code);


--
-- Name: payments uknuscjm6x127hkb15kcb8n56wo; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT uknuscjm6x127hkb15kcb8n56wo UNIQUE (booking_id);


--
-- Name: payments ukpnm6vsiu5aigugb4f7847kvt5; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT ukpnm6vsiu5aigugb4f7847kvt5 UNIQUE (vnp_txn_ref);


--
-- Name: account ukq0uja26qgu1atulenwup9rxyr; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT ukq0uja26qgu1atulenwup9rxyr UNIQUE (email);


--
-- Name: bookings ukq97166k18hklq6ls46osbrftx; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT ukq97166k18hklq6ls46osbrftx UNIQUE (booking_code);


--
-- Name: user_vouchers user_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.user_vouchers
    ADD CONSTRAINT user_vouchers_pkey PRIMARY KEY (id);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: idx_cart_account; Type: INDEX; Schema: public; Owner: ffzone
--

CREATE INDEX idx_cart_account ON public.carts USING btree (account_id);


--
-- Name: idx_cartitem_cart; Type: INDEX; Schema: public; Owner: ffzone
--

CREATE INDEX idx_cartitem_cart ON public.cart_items USING btree (cart_id);


--
-- Name: idx_fieldslot_field_date; Type: INDEX; Schema: public; Owner: ffzone
--

CREATE INDEX idx_fieldslot_field_date ON public.field_slots USING btree (field_id, slot_date);


--
-- Name: field_pricing fk12qtt1fap4279imordidacegg; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_pricing
    ADD CONSTRAINT fk12qtt1fap4279imordidacegg FOREIGN KEY (field_id) REFERENCES public.fields(id);


--
-- Name: booking_services fk1etky587qu1tqlr3t1r7w59gx; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT fk1etky587qu1tqlr3t1r7w59gx FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: refunds fk2yakjn3r71apljf4nh9x228sw; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT fk2yakjn3r71apljf4nh9x228sw FOREIGN KEY (processed_by) REFERENCES public.account(id);


--
-- Name: refunds fk3nlfu8o4nsl1kcfp2sg8q4gnd; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT fk3nlfu8o4nsl1kcfp2sg8q4gnd FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: field_images fk3qj5p3njvo0xsv9ktv2n0trdo; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_images
    ADD CONSTRAINT fk3qj5p3njvo0xsv9ktv2n0trdo FOREIGN KEY (field_id) REFERENCES public.fields(id);


--
-- Name: user_vouchers fk40ig7khk2v79rbqaj98mf1g2q; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.user_vouchers
    ADD CONSTRAINT fk40ig7khk2v79rbqaj98mf1g2q FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id);


--
-- Name: user_vouchers fk76l2u4wd3id06hda4txnsvq3v; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.user_vouchers
    ADD CONSTRAINT fk76l2u4wd3id06hda4txnsvq3v FOREIGN KEY (account_id) REFERENCES public.account(id);


--
-- Name: bookings fk8eqtsqms4x56hwwe9ro8psvce; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk8eqtsqms4x56hwwe9ro8psvce FOREIGN KEY (field_id) REFERENCES public.fields(id);


--
-- Name: bookings fk8h9cuge8sldba6jettn8op94m; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk8h9cuge8sldba6jettn8op94m FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id);


--
-- Name: payments fkc52o2b1jkxttngufqp3t7jr3h; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fkc52o2b1jkxttngufqp3t7jr3h FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: booking_slots fkfbxpy4ovy5hh9e1f9vyolha2x; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT fkfbxpy4ovy5hh9e1f9vyolha2x FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: bookings fkgvog9fwe5ttw43psibvlpiv3c; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fkgvog9fwe5ttw43psibvlpiv3c FOREIGN KEY (account_id) REFERENCES public.account(id);


--
-- Name: cart_items fkhhdqvapm8r3jbst2q63ppnmf2; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT fkhhdqvapm8r3jbst2q63ppnmf2 FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: booking_services fkhhofk6n050slfqp0v6e65axk3; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT fkhhofk6n050slfqp0v6e65axk3 FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: booking_services fkih0fqsj8jm1tdjxk83u6fyqwr; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_services
    ADD CONSTRAINT fkih0fqsj8jm1tdjxk83u6fyqwr FOREIGN KEY (added_by) REFERENCES public.account(id);


--
-- Name: field_slots fkkir4dv79043cylolxdwe3kvee; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.field_slots
    ADD CONSTRAINT fkkir4dv79043cylolxdwe3kvee FOREIGN KEY (field_id) REFERENCES public.fields(id);


--
-- Name: booking_slots fkog9ucc9xy1ptotwuya54tytg1; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT fkog9ucc9xy1ptotwuya54tytg1 FOREIGN KEY (field_slot_id) REFERENCES public.field_slots(id);


--
-- Name: cart_items fkpcttvuq4mxppo8sxggjtn5i2c; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT fkpcttvuq4mxppo8sxggjtn5i2c FOREIGN KEY (cart_id) REFERENCES public.carts(id);


--
-- Name: carts fktbh18csnlmy9mre0klfe4m941; Type: FK CONSTRAINT; Schema: public; Owner: ffzone
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT fktbh18csnlmy9mre0klfe4m941 FOREIGN KEY (account_id) REFERENCES public.account(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO ffzone;


--
-- PostgreSQL database dump complete
--

\unrestrict 8b4gf2n7en9SWEyAh6WNi9hZUKedNVh8Eu8DVkpdkkMYOhUuM6tz4y7nYUucsRn

