import React from 'react';
import { GetServerSidePropsContext } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { TemporalGraphExplorer } from '@/components/temporal';
import Head from 'next/head';

export default function TemporalGraphPage() {
  return (
    <>
      <Head>
        <title>Temporal Graph Explorer - LiveGuide</title>
        <meta name="description" content="Explore your knowledge graph evolution over time" />
      </Head>
      <div className="h-screen flex flex-col">
        <TemporalGraphExplorer className="flex-1" />
      </div>
    </>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const supabase = createServerSupabaseClient(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialSession: session,
      user: session.user,
    },
  };
}